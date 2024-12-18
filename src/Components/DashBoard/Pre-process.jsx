import React, { useState, useEffect, useRef} from 'react';
import './Pre-process.css';
import Footer from '../Home/Footer';
import Grid from '../../Grid';
import Defaultbars from './Defaultbars';
import { db, storage, auth } from '../../firebase'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaUpload, FaTrashAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore"; 

function Preprocess() {
  // Constants
  const vid = {
    vid1: 'Gradient 2.mp4',
    pre: "pre-process.png",
  };

  // State declarations
  const [images, setImages] = useState([]);
  const [description, setDescription] = useState('');
  const [mass, setMass] = useState('');
  const [option, setOption] = useState('');
  const [customOption, setCustomOption] = useState('');
  const [analysisType, setAnalysisType] = useState(''); 
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const responseContainerRef = useRef(null);


  // Authentication and user setup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              createdAt: new Date(),
              isSubscribed: false, 
              metadata: { 
                tags: [],
                status: 'draft'
              }
            });
          }
        } catch (error) {
          console.error('Error saving user data to Firestore:', error);
        }
      } else {
        navigate('/authentication');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (response && responseContainerRef.current) {
      responseContainerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [response]);

  // Event handlers
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages((prevImages) => [...prevImages, ...files]);
  };

  const handleDeleteImage = (index) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  const handleMaterialsChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setMaterials((prevMaterials) => [...prevMaterials, value]);
    } else {
      setMaterials((prevMaterials) => prevMaterials.filter((material) => material !== value));
    }
  };

  // Error handling function
  const handleError = (error) => {
    let errorMessage;
    
    if (error.response) {
      errorMessage = error.response.data.error || 'Server error occurred';
      console.error('Server error:', error.response.data);
    } else if (error.request) {
      errorMessage = 'Network error - please check your connection';
      console.error('Network error:', error.request);
    } else {
      const [errorType, errorDesc] = error.message.split(':');
      const errorMessages = {
        'VALIDATION_ERROR': errorDesc,
        'AUTH_ERROR': 'Please log in again to continue',
        'USER_ERROR': 'User profile not found. Please try logging out and back in',
        'SUBSCRIPTION_ERROR': 'Please upgrade your subscription to continue',
        'FILE_SIZE_ERROR': errorDesc,
        'API_ERROR': 'Server processing failed. Please try again later',
        'NETWORK_ERROR': 'Connection failed. Please check your internet connection'
      };
      errorMessage = errorMessages[errorType] || errorDesc || 'An unexpected error occurred';
    }
    
    alert(errorMessage);
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      alert('User is not authenticated. Please log in.');
      setLoading(false);
      navigate('/authentication');
      return;
    }

    try {
      // Input validation
      const validationErrors = [];
      if (!description?.trim()) validationErrors.push('Description is required');
      if (!mass?.trim()) validationErrors.push('Mass is required');
      if (!materials?.length) validationErrors.push('At least one material must be selected');
      if (!analysisType) validationErrors.push('Analysis type is required');
      if (!images?.length) validationErrors.push('At least one image is required');

      if (validationErrors.length > 0) {
        throw new Error('VALIDATION_ERROR:' + validationErrors.join(', '));
      }

      console.log('user id', user.uid)

      // User and subscription validation
      const userDocRef = doc(db, "users", user.uid);

      console.log('user reference', userDocRef)

      const userDocSnap = await getDoc(userDocRef);

      console.log('reference fetched')

      if (!userDocSnap.exists()) {
        throw new Error('USER_ERROR:User profile not found');
      }

      const userData = userDocSnap.data();
      if (!userData.isSubscribed) {
        throw new Error('SUBSCRIPTION_ERROR:Please upgrade to continue');
      }

      // Form data preparation with validation
      const formData = new FormData();
      const maxFileSize = 5 * 1024 * 1024; // 5MB

      for (const image of images) {
        if (image.size > maxFileSize) {
          throw new Error(`FILE_SIZE_ERROR:${image.name} exceeds 5MB limit`);
        }
        formData.append('images', image);
      }


      // Append validated form data
      formData.append('description', description.trim());
      formData.append('mass', mass.trim());
      formData.append('materials', JSON.stringify(materials));
      formData.append('option', option);
      formData.append('customOption', customOption);
      formData.append('analysisType', analysisType);
      formData.append('userId', user.uid);

      // Get fresh ID token and make API request
      const idToken = await user.getIdToken(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      console.log('API URL:', apiUrl); 
  
      const response = await axios({
        method: 'POST', 
        url: `${apiUrl}/preprocess`, 
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${idToken}`
        },
        withCredentials: true,
        timeout: 300000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      console.log('Response:', response); 
  
      const { id, generatedResponse } = response.data;
      
      if (!id || !generatedResponse) {
        throw new Error('API_ERROR:Invalid response from server');
      }
  
      // Success handling
      resetForm();
      setResponse(generatedResponse);
      alert('Project created successfully!');
      navigate(`/Projects/${id}`);
  
    } catch (error) {
      console.error('Error details:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // Form reset handler
  const resetForm = () => {
    setImages([]);
    setDescription('');
    setMass('');
    setMaterials([]);
    setOption('');
    setCustomOption('');
    setAnalysisType('');
  };

  // PDF generation handler
  const generatePDF = async () => {
    if (!user) {
      alert('Please log in to generate a report');
      return;
    }

    if (!response) {
      alert('No data available to generate report');
      return;
    }

    try {
      const doc = new jsPDF();
      const margin = 10;
      let yPosition = margin;

      // Add header
      doc.setFontSize(16);
      doc.text("Project Report", margin, yPosition);
      yPosition += 15;

      // Add project details
      doc.setFontSize(12);
      const details = [
        `Description: ${description}`,
        `Mass: ${mass}`,
        `Materials: ${materials.join(", ")}`,
        `Analysis Type: ${analysisType}`,
        `Preferred Software: ${option} ${customOption}`
      ];

      details.forEach(detail => {
        if (yPosition > doc.internal.pageSize.height - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(detail, margin, yPosition);
        yPosition += 10;
      });

      // Add response content with page breaks
      if (response) {
        yPosition += 10;
        doc.text("Analysis Results:", margin, yPosition);
        yPosition += 10;

        const responseLines = response.split('\n');
        responseLines.forEach(line => {
          if (yPosition > doc.internal.pageSize.height - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += 7;
        });
      }

      // Save and upload PDF
      const timestamp = new Date().toISOString();
      const fileName = `report_${timestamp}.pdf`;
      const pdfBlob = doc.output("blob");

      // Upload to Firebase
      const pdfRef = ref(storage, `reports/${user.uid}/${fileName}`);
      await uploadBytes(pdfRef, pdfBlob);
      const pdfURL = await getDownloadURL(pdfRef);

      // Trigger download
      const pdfBlobURL = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = pdfBlobURL;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(pdfBlobURL);

      alert('Report generated and uploaded successfully!');
      return pdfURL;

    } catch (error) {
      console.error('Error generating or uploading PDF:', error);
      alert('Failed to generate report. Please try again later.');
    }
  };


  return (
    <div id='pre'>
      <video id="background-video" src={vid.vid1} controls loop autoPlay muted></video>
      <Grid />
      <Defaultbars />
      <div className='current'>
        <div><img src={vid.pre} alt="Pre-process" /></div>
        <h2>Clarity & Accuracy For Pre-Processing</h2>
      </div>
      <div className="preprocess">
        <form onSubmit={handleSubmit} className="image-form">
          <div className="form-group">
            <label htmlFor="imageUpload">Upload 3D CAD Images of Your Model:</label>
            <div className="custom-file-upload">
              <label htmlFor="imageUpload" id='hov'>
                <FaUpload size={30} />
              </label>
              <input
                type="file"
                id="imageUpload"
                onChange={handleImageChange}
                multiple
                style={{ display: 'none' }}
                required
              />
            </div>
          </div>
          <div className="uploaded-images">
            {images.map((image, index) => (
              <div key={index} className="image-preview">
                <img src={URL.createObjectURL(image)} alt={`preview-${index}`} />
                <button type="button" onClick={() => handleDeleteImage(index)}>
                  <FaTrashAlt />
                </button>
              </div>
            ))}
          </div>
          <div className="form-group">
            <label htmlFor="description">Provide The Default Mass of Your Model</label>
            <textarea
              type='text'
              id="mass"
              value={mass}
              onChange={(e) => setMass(e.target.value)}
              placeholder='The default mass(g/kg) of your model in the images uploaded.'
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">What Are You Trying To Achieve?</label>
            <textarea
              type='text'
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Please describe briefly your project, goals and objectives... MeanAs can assist you throughout your specific project.'
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="analysisType">Select Analysis Type:</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="FEA"
                  checked={analysisType === 'FEA'}
                  onChange={(e) => setAnalysisType(e.target.value)}
                />
                FEA
              </label>
              <label>
                <input
                  type="radio"
                  value="CFD"
                  checked={analysisType === 'CFD'}
                  onChange={(e) => setAnalysisType(e.target.value)}
                />
                CFD
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="materials">Select Recommendations for Materials:</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  value="Metals/Alloys"
                  onChange={handleMaterialsChange}
                />
                Metals
              </label>
              <label>
                <input
                  type="checkbox"
                  value="Liquids"
                  onChange={handleMaterialsChange}
                />
                Liquids
              </label>
              <label>
                <input
                  type="checkbox"
                  value="Polymers"
                  onChange={handleMaterialsChange}
                />
                Polymers
              </label>
              <label>
                <input
                  type="checkbox"
                  value="Plastics"
                  onChange={handleMaterialsChange}
                />
                Plastics
              </label>
              <label>
                <input
                  type="checkbox"
                  value="Composite"
                  onChange={handleMaterialsChange}
                />
                Composite
              </label>
              <label>
                <input
                  type="checkbox"
                  value="Ceramics"
                  onChange={handleMaterialsChange}
                />
                Ceramics
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="option">Select A Preferred Analysis Software For Your Project:</label>
            <select id="option" value={option} onChange={(e) => setOption(e.target.value)} required>
              <option value="">Select an analysis software</option>
              <option value="ansys">Ansys</option>
              <option value="abaqus">Abaqus</option>
              <option value="comsol">Comsol</option>
              <option value="solidworks">Solidworks</option>
              <option value="openfoam">OpenFoam</option>
              <option value="fusion360">Fusion 360</option>
              <option value="other">Other</option>
            </select>
            {option === 'other' && (
              <input
                type='text'
                id="texti"
                value={customOption}
                onChange={(e) => setCustomOption(e.target.value)}
                placeholder='Type your custom option...'
                required
              />
            )}
          </div>
          <button type="submit" disabled={loading} id='newbut'>
            {loading ? 'Generating...' : 'Generate Clarity'}
          </button>
        </form>
      </div>
      <div className="response-container" ref={responseContainerRef}>
        <div className="response">
          {response || 'No response yet. Click "Generate Clarity" '}
        </div>
        <button className='report' onClick={generatePDF}>
          Generate Report
        </button>
      </div>
      <Footer />
    </div>
  );
}

export default Preprocess;
