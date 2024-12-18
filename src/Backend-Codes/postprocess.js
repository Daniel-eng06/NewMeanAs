import express from 'express';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import dotenv from 'dotenv';
import axios from 'axios';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
dotenv.config();
admin.initializeApp();

const router = express.Router();


//check the firebase rule for this
// Initialize Firestore and Storage
const firestore = getFirestore();
const storage = getStorage();

// Function to make an API call to OpenAI Vision Pro
async function callOpenAIVisionPro(imageUrls, promptText) {
  try {
    const data = {
      images: imageUrls.map(url => ({ url })),
      prompt: promptText,
    };

    const response = await axios.post('https://api.openai.com/v1/images', data, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error calling OpenAI Vision Pro:', error);
    throw new Error('Failed to call OpenAI Vision Pro');
  }
}

// Endpoint to handle data processing
router.post('/', async (req, res) => {
  try {
    const { goal, imageUrls, analysisType, detailLevel } = req.body;

    // Validate required fields
    if (!goal || !imageUrls || !Array.isArray(imageUrls) || !analysisType || !detailLevel || !Array.isArray(detailLevel)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save data to Firestore
    const projectRef = await addDoc(collection(firestore, 'errorGoals'), {
      goal,
      imageUrls,
      analysisType,
      detailLevel,
      timestamp: new Date(),
    });

    // Upload images to Firebase Storage and get their URLs
    const uploadedImageUrls = await Promise.all(imageUrls.map(async (url, index) => {
      try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const storageRef = ref(storage, `uploads/${projectRef.id}_${index}.jpg`);
        await uploadBytes(storageRef, buffer, { contentType: 'image/jpeg' });
        return getDownloadURL(storageRef);
      } catch (error) {
        console.error(`Error processing image ${url}:`, error);
        throw new Error('Failed to upload image');
      }
    }));

    // Create the prompt text based on the analysis type
    let promptText;
    if (analysisType === 'FEA') {
      promptText = `
      Role: As a CAE expert, Senior Engineer in all engineering fields, and physicist with extensive knowledge in Finite Element Analysis (FEA), your task involves post-processing the FEA results of the provided model.
      
      Task: With this as my ${goal}  Bolden the key factors:
      
      1. FEA Results Interpretation:
         - Analyze the stress and strain distributions obtained from the FEA analysis in the provided visualized images.
         - Identify key areas of interest, such as regions with high stress concentrations or significant deformation.
         - Compare the analyzed yield strength values from the FEA results with the standard yield strength of the materials used.
         - Provide a detailed interpretation of these results, explaining how they align with the objectives of the FEA study.
      
      2. Material Performance Evaluation:
         - Evaluate the performance of the selected material under the simulated FEA conditions.
         - Compare the standard yield strength values with the analyzed yield strength from the visualized FEA results.
         - Assess whether the materials meet the expected performance criteria based on the FEA results, and suggest any necessary material changes.
      
      3. FEA Results Comparison and Validation:
         - Compare the FEA results with any available experimental data, theoretical calculations, or previous simulations (if applicable).
         - Discuss any discrepancies between the FEA results and these other data sources, providing potential reasons for any differences.
         - Recommend any additional simulations or model adjustments that could improve the accuracy of the FEA results.
      
      4. Roadmap for Final Reporting:
         - Create a clear and concise roadmap for compiling the final FEA report using this detail level: ${detailLevel}.
         - For instance, if the level of detail is ${detailLevel}: Provide the explanation and final report according to the specified detail level:
           - High Student Level: Simplify the explanation with basic terminology and illustrative examples, suitable for individuals with a limited background in engineering.
           - Detailed Technical Insight: Offer an in-depth analysis with technical details, including mathematical formulations and thorough discussions, addressing specific technical questions.
           - Marketing Level: Highlight the key benefits and real-world applications of the FEA results, using persuasive language to emphasize the impact and relevance.
           - Research Level: Deliver a comprehensive, scholarly report with advanced technical details, theoretical background, and references to relevant research, supporting a deep understanding of the results.
      `;
    } else if (analysisType === 'CFD') {
      promptText = `
      Role: As a CAE expert, Senior Engineer in all engineering fields, and physicist with extensive knowledge in Computational Fluid Dynamics (CFD), your task involves post-processing the CFD results of the provided model.

      Task: With this as my ${goal}  Bolden the key factors:

      1. CFD Results Interpretation:
        - Analyze the fluid flow patterns and other relevant results obtained from the CFD analysis in the provided visualized images.
        - Identify key areas of interest, such as regions with high turbulence, pressure drops, or flow separations.
        - Compare the analyzed results with any theoretical or experimental data if available.
        - Provide a detailed interpretation of these results, explaining how they align with the objectives of the CFD study.

      2. Material and Boundary Condition Evaluation:
        - Evaluate the performance of the materials and boundary conditions used in the CFD analysis.
        - Assess how the boundary conditions affect the fluid flow and heat transfer results.
        - Suggest any necessary changes to the boundary conditions or materials based on the CFD results.
      
      3. CFD Results Comparison and Validation:
        - Compare the CFD results with any available experimental data, theoretical predictions, or previous simulations (if applicable).
        - Discuss any discrepancies and provide potential reasons for differences.
        - Recommend any additional simulations or model adjustments that could improve the accuracy of the CFD results.

      4. Roadmap for Final Reporting:
        - Create a clear and concise roadmap for compiling the final CFD report using this detail level: ${detailLevel}.
        - For instance, if the level of detail is ${detailLevel}: Provide the explanation and final report according to the specified detail level:
          - High Student Level: Simplify the explanation with basic terminology and illustrative examples, suitable for individuals with a limited background in fluid dynamics.
          - Detailed Technical Insight: Offer an in-depth analysis with technical details, including mathematical formulations, assumptions made during the CFD analysis, and thorough discussions of the results.
          - Marketing Level: Highlight the key benefits and practical applications of the CFD results, using persuasive language to emphasize their impact on real-world problems.
          - Research Level: Deliver a comprehensive, scholarly report with advanced technical details, theoretical background, and references to relevant research, supporting a deep understanding of the CFD results.
      `;
    } else {
      promptText = `
      Please specify a valid analysis type (e.g., FEA or CFD) and provide the necessary details for the analysis.  Bolden the key factors
      - **Analysis Type**: Choose between FEA or CFD.
      - **Description**: Provide a brief description of the analysis.
      - **Materials**: Specify the materials used in the analysis.
      - **Detail Level**: Indicate the level of detail required for the final report (e.g., High Student Level, Detailed Technical Insight, Marketing Level, Research Level).
      - **Option**: Specify any specific options or custom settings for the analysis.
      - **Custom Option**: Provide any additional custom details relevant to the analysis.
  
      Ensure all required fields are completed for accurate and effective analysis.
      `;
    }

    // Call OpenAI Vision Pro to process images and the prompt
    const openAIResponse = await callOpenAIVisionPro(uploadedImageUrls, promptText);
    const generatedResponse = openAIResponse.choices[0].text;

    // Save the generated response to Firestore
    await addDoc(collection(firestore, 'responses'), {
      projectId: projectRef.id,
      generatedResponse,
      timestamp: new Date(),
    });

    res.status(200).json({ id: projectRef.id, response: generatedResponse });
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ error: 'Failed to process data' });
  }
});

export default router;
