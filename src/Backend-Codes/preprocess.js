import express from 'express';

import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import {firestore} from '../../firebase.js'

dotenv.config();

const router = express.Router();


// Set up multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Function to make an API call to Claude
async function callGPTAPI(imageUrls, promptText) {
  const systemPrompt = `You are a CAE expert, Senior Engineer in all engineering fields, and physicist with extensive knowledge in all kinds of analysis under FEA/CFD. You will analyze the provided images and information carefully, ensuring your responses are detailed, technical, and actionable. You should:
1. Focus on practical implementation details
2. Provide numerical values and specific recommendations
3. Highlight critical aspects of the analysis
4. Explain your reasoning for each recommendation
5. Consider both theoretical principles and practical limitations
6. Maintain professional engineering terminology throughout your response`;


    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: promptText
      },
      ...imageUrls.map(url => ({
        type: 'image',
        source: {
          type: 'url',
          url: url
        }
      }))
    ];

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4o-mini-2024-07-18",  
      messages: messages
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`  
      }
    });

  return response.data;
} 

// Endpoint to handle data processing
router.post('/', upload.array('images'), async (req, res) => {
  try {
    const { description, mass, materials, option, customOption, analysisType } = req.body;
    const files = req.files;

    // Validate input data
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Invalid Description' });
    }

    if (!mass || typeof mass !== 'string') {
      return res.status(400).json({ error: 'Invalid Mass' });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

  
    // Save data to Firestore
    const data = {
      description,
      mass,
      materials: JSON.parse(materials),
      option,
      customOption,
      analysisType,
      timestamp: new Date(),
    };
    
    // Add a new document in collection "cities" with ID 'LA'
    const projectRef = await firestore.collection('projects').set(data);

    // Upload images to Firebase Storage and get their URLs
    const uploadedImageUrls = await Promise.all(files.map(async (file, index) => {
      try {
        // const storageRef = ref(storage, `uploads/${projectRef.id}_${index}.jpg`);
        // const fileRef = storageRef.child(`uploads/${res.id}_${index}.jpg`);
        // await storageRef.put(file)
        // await uploadBytes(fileRef, file.buffer, { contentType: file.mimetype });
        // return await getDownloadURL(fileRef);
        // return await fileRef.getDownloadURL();
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw new Error('Failed to upload image');
      }
    }));
    const validImageUrls = uploadedImageUrls.filter(url => url !== null);

    // Respond to the client with the project ID and uploaded image URLs
    res.status(200).json({
      message: 'Project created successfully',
      projectId: projectRef.id,
      uploadedImageUrls: validImageUrls,
    });

    // prompt text based on the analysis type
    let promptText;
    if (analysisType === 'FEA') {
      promptText = `
        Task: With this as my ${description} Bolden the key factors:

        1. Model Analysis and Geometry Cleanup:
          - Analyze the model in the provided images, focusing on geometry cleanup.
          - Check for errors, inconsistencies, and topological issues.
          - Provide solutions to perfect the model for further analysis.

        2. Analysis Type Recommendation:
          - Recommend the specific analysis type I should perform that aligns with my goal that is define the physical behaviours that relates to the model in the image.

        3. Material Selection:
          - Suggest 3-5 materials from ${materials} that best suit my goal and select the materials from MatWeb, including full numerical properties for use specifically in my analysis.
           <example>:
            - Stainless Steel
              - Density: 7.85 g/cm³
              - Tensile Strength: 515-720 MPa
              - Young's Modulus: 193 GPa
              - Thermal Conductivity: 16.2 W/mK
              - Electrical Conductivity: 1.45x10⁶ S/m
              - Melting Point: 1400-1450°C
            </example>
        4. Mesh Quality and Critical Locations:
          - Identify critical locations on the model in the provided image that require high-quality meshing.
          - Provide mesh quality criteria for these areas. 
          <examples>:
            - "At the top corner of the model where there is a hole, increase the mesh quality by using an element size of 0.1 at the edges."
          </examples>

        5. Boundary Conditions and Numerical Parameters:
          -Based on the current mass ${mass} of the model in the images without materials assigned to it.
          - Examine the model and suggest boundary conditions and numerical parameters for applied loads on specific areas in the provided images. 
          <example>:
            - "Consider applying a fixed support at the bolted areas on the left and right sides of the model."
            - "Consider applying a downward-facing load of 10N on the top layer of the model."
          <example>
          - If possible, provide relevant calculations for the boundary conditions needed for the analysis, including loads, constraints, and supports.

        6. Roadmap and Analysis Recommendations:
          - Using all the provided data, create a clear and concise roadmap for conducting the analysis in ${option} ${customOption}.
          <example>
              →Workbench
              Open ANSYS Workbench

              →Analysis_Systems
              Drag "Static Structural" from Analysis Systems to Project Schematic

              →Geometry
              Double-click "Geometry" cell
              Click "File" > "Import External Geometry File"
              Select phone holder CAD file
              Click "Generate" to create geometry

              →Engineering_Data
              Double-click "Engineering Data" cell
              Click "Engineering Data Sources"
              Expand "General Materials" > Select "Polycarbonate"
              Click "Add to Engineering Data"
              Close Engineering Data window

              →Model
              Double-click "Model" cell to open Design Modeler
              Click "Generate" to create model
              Right-click model > "Named Selection" > Create selections for plug area and support points

              →Setup
              Double-click "Setup" cell to open Mechanical
              Expand "Mesh" in outline
              Right-click "Mesh" > Insert "Method"
              Select body > Choose "Hex Dominant"
              Right-click "Mesh" > Insert "Sizing"
              Set element size to 2 mm
              Apply load around the circular section where is located below the the flat surface athe right corner
              Click "Generate Mesh"

              →Static_Structural
              Expand "Static Structural" in outline
              Right-click > Insert > "Fixed Support"
              Select base of holder
              Right-click > Insert > "Force"
              Select plug area > Set to 50 N downward(provide real values that can be related to the model)

              →Solution
              Right-click "Solution" > Insert > "Total Deformation"
              Right-click "Solution" > Insert > "Equivalent Stress"

              →Solve
              Click "Solve" button in toolbar

              →Results
              Double-click each result item to view

              →Tools
              Click "Tools" > "Report Preview" to generate report

              →Save
              Click "File" > "Save As" > Name project "Phone_Holder_FEA.ansys"
          </example>
          - Include detailed recommendations for the analysis process, focusing on achieving the best possible results for the specific model in the provided image.
        `;
       
    } else if (analysisType === 'CFD') {
      promptText = `
        Task: With this as my ${description} Bolden the key factors:
    
        1. Model Analysis and Geometry Cleanup:
          - Analyze the model in the provided images, focusing on geometry cleanup for fluid dynamics.
          - Check for errors, inconsistencies, and topological issues that could affect fluid flow simulations.
          - Provide solutions to perfect the model for accurate CFD analysis.
    
        2. Flow Domain and Boundary Condition Setup:
          - Recommend the appropriate flow domain setup, including inlet, outlet, and wall boundary conditions.
          - Specify any special boundary conditions that align with my goal, such as symmetry planes, periodic boundaries, or moving walls.
    
        3. Mesh Quality and Refinement:
          - Identify critical regions in the model where flow gradients are expected to be high (e.g., near walls, around obstacles, or at interfaces).
          - Recommend mesh refinement strategies for these regions, including boundary layer meshing and local grid refinement. Example:
            - "Refine the mesh near the leading edge of the airfoil with a minimum element size of 0.05 mm to capture the boundary layer effects accurately."
    
        4. Fluid Properties and Material Selection:
          - Suggest 3-5 fluid materials and materials from ${materials} that best suit the analysis goal, including properties such as viscosity, density, specific heat, and thermal conductivity.
          - Provide detailed numerical properties for the selected fluids from sources like MatWeb.
    
        5. Solver Settings and Numerical Parameters:
          - Recommend solver settings appropriate for the type of flow (laminar, turbulent, compressible, incompressible) and the specific objectives of the analysis.
          - Suggest turbulence models, time-stepping methods, or other solver parameters crucial for accurate results.
    
        6. Roadmap and Analysis Recommendations:
          - Using all the provided data, create a clear and concise roadmap for conducting the CFD analysis in ${option} ${customOption}.
          <example>
              →Open ANSYS Workbench
              Open ANSYS Workbench on your computer.

              →Drag "Fluent" from Analysis Systems to Project Schematic
              In the "Analysis Systems" toolbox, find "Fluent" and drag it to the Project Schematic.

              →Geometry
              Double-click on the "Geometry" cell to open DesignModeler or SpaceClaim.
              Import your geometry file by clicking "File" > "Import External Geometry File".
              Select the geometry file and click "Open".

              →Geometry Cleanup
              Use tools in the DesignModeler or SpaceClaim to clean up the geometry:
              - Remove unnecessary features.
              - Repair any gaps or overlapping surfaces.
              - Create a fluid domain if necessary by using "Create" > "Volume Extraction" for internal flows. or use encloser or fill for interior
          
              →Meshing
              Double-click on the "Mesh" cell to open the Meshing application.
              Set up the flow domain and apply boundary conditions by defining named selections for inlets, outlets, and walls.

              →Named Selections
              Right-click on the "Mesh" > "Named Selections" > Create named selections for "Inlet", "Outlet", and "Walls".

              →Mesh Generation
              Use the meshing controls (e.g., sizing, inflation) to refine the mesh in critical areas:
              - Set the "Sizing" option under "Mesh Control" to control mesh density.
              - Use "Inflation" layers to capture boundary layer effects near walls.
              Click "Generate Mesh" to finalize the mesh.
          
              →Local Mesh Refinement
              Use the "Mesh Control" options to refine the mesh locally.
              Set a finer element size for critical regions like the leading edges, surfaces of interest, or areas with high flow gradients.
              Ensure proper inflation layers to capture the boundary layer.
              Click "Generate Mesh" again to update the mesh with refinements.
        
              →Setup - Fluent
              Double-click on the "Setup" cell to open ANSYS Fluent.
              In Fluent, go to the "Materials" panel by clicking "Define" > "Materials".
              Select the fluid material or create a new one by clicking "Create/Edit".
              Enter the material properties, such as density, viscosity, specific heat, and thermal conductivity.

              →Material Assignment
              Assign the defined fluid to the relevant zones in the model under "Cell Zone Conditions".
        
              →Solver Configuration
              In Fluent, go to "Solver" > "Models".
              Select the appropriate flow model (e.g., Laminar, k-epsilon, k-omega for turbulence).
              Choose the energy model if heat transfer is involved.
              Set up the solver settings under "Solution Methods", selecting appropriate schemes (e.g., SIMPLE, Coupled) and discretization methods.

              →Boundary Conditions
              Set up the boundary conditions under "Boundary Conditions" in Fluent with the current default mass of the model being ${mass}.
              Specify conditions for inlets (velocity, mass flow rate), outlets (pressure), and walls (no-slip, moving walls).
          
              →Run Calculation
              Go to "Run Calculation" panel in Fluent.
              Set the number of iterations or time steps for transient simulations. example 100-3000 iterations
              Click "Calculate" to start the simulation.

              →Post-Processing
              After the simulation, go to the "Results" panel in Fluent.
              Use "Contours", "Vectors", and "Streamlines" tools to visualize the flow fields.
              Extract key performance indicators such as pressure drop, drag coefficients, or heat transfer rates.

              →Export Results
              Export the simulation data and results by going to "File" > "Export" > "Solution Data".
              Save the data in a preferred format for further analysis or reporting.

              →Save Project
              Click "File" > "Save As" to save your project with a descriptive name.
          </example>
          - Include recommendations for post-processing, such as monitoring convergence, visualizing flow fields, and extracting key performance indicators (e.g., pressure drop, drag, or heat transfer rates).
      `;
    } else {
      promptText = `
      The provided analysis type (${analysisType}) is not recognized or is invalid. Please specify a valid analysis type (e.g., 'FEA' for Finite Element Analysis or 'CFD' for Computational Fluid Dynamics) to proceed.
      Bolden the key factors
      Ensure the following details are included:
      - Analysis Type: Choose between 'FEA' or 'CFD'.
      - Description: Provide a brief description of the analysis.
      - Materials: Specify the materials used in the analysis.
      - Option: Specify any specific options or custom settings for the analysis.
      - Custom Option: Provide any additional custom details relevant to the analysis.
      - Detail Level: Indicate the level of detail required for the final report (e.g., High Student Level, Detailed Technical Insight, Marketing Level, Research Level).
  
      Completing all required fields will ensure accurate and effective analysis.
      `;
    }

    // Call callGPTAPI to process images and the prompt
    const gptResponse = await callGPTAPI(uploadedImageUrls, promptText);
    const generatedResponse = gptResponse.content[0].text;

    // Save the generated response to Firestore
    await firestore.collection('projects').set({
      projectId: res.id,
      generatedResponse,
      timestamp: new Date(),
    });

    res.status(200).json({id: res.id, response: generatedResponse });
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ error: error.message || 'Failed to process data' });
  }
});

export default router;