import React, { useState } from 'react';
import './Errorchecker.css';
import Footer from '../Home/Footer';
import Grid from '../../Grid';
import Defaultbars from './Defaultbars';
import { storage} from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaUpload, FaTrashAlt } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import axios from 'axios';

function Errorchecker() {
  const vid = {
    vid1: 'Gradient 2.mp4',
    error: "error.png",
  };

  const [images, setImages] = useState([]);
  const [goal, setGoal] = useState('');
  const [option, setOption] = useState('');
  const [customOption, setCustomOption] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages((prevImages) => [...prevImages, ...files]);
  };

  const handleDeleteImage = (index) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);


    /*We need to check this and set the firebase individual rule for this part of the code */
    if (images.length > 0 && goal && option) {
        try {
            // Upload images to Firebase Storage and get their URLs
            const imageUrls = await Promise.all(images.map(async (image) => {
                const storageRef = ref(storage, `errors/${image.name}`);
                await uploadBytes(storageRef, image);
                return getDownloadURL(storageRef);
            }));

            // Send data to the backend
            const response = await axios.post('/errorchecker', {
                goal,
                imageUrls,
                analysisType: option === 'other' ? customOption : option,
                // No need to send `timestamp`, the backend will handle this
            });

            const { id, response: generatedResponse } = response.data;

            // Reset form state
            setImages([]);
            setGoal('');
            setOption('');
            setCustomOption('');
            setResponse(generatedResponse);

        } catch (error) {
          console.error("Error uploading file or sending data", error);
          alert("An error occurred. Please try again.");
        }
    } else {
        alert('Please upload images, enter your goal, and select the analysis software.');
    }
};


  const generatePDF = async () => {
    const doc = new jsPDF();
    doc.text("Project Report", 10, 10);
    doc.text(`Description: ${goal}`, 10, 20);
    doc.text(`Materials: ${images.map(img => img.name).join(", ")}`, 10, 30);
    doc.text(`Analysis Type: ${option === 'other' ? customOption : option}`, 10, 40);
    
    // Adding response to the PDF
    const responseLines = response.split('\n');
    let yOffset = 50;
    responseLines.forEach(line => {
      doc.text(line, 10, yOffset);
      yOffset += 10;
    });

    // Output PDF as a Blob
    const pdfBlob = doc.output("blob");


    //check up and create a firebase rule for this
    // Upload PDF to Firebase Storage
    const pdfRef = ref(storage, `reports/report_${new Date().getTime()}.pdf`);
    await uploadBytes(pdfRef, pdfBlob);
    const pdfURL = await getDownloadURL(pdfRef);

    // Automatically download the PDF
    const pdfBlobURL = URL.createObjectURL(pdfBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = pdfBlobURL;
    downloadLink.download = "report.pdf";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    alert(`Report generated and uploaded successfully! URL: ${pdfURL}`);
  };

  return (
    <div id='err'>
      <video id="background-video" src={vid.vid1} controls loop autoPlay muted></video>
      <Grid />
      <Defaultbars />
      <div className='current'>
        <div><img src={vid.error} alt="Errorchecker" /></div>
        <h2>FEA/CFD Analysis Error Solutions</h2>
      </div>
      <div className="errorcheck">
        <form onSubmit={handleSubmit} className="image-form">
          <div className="form-group">
            <label htmlFor="imageUpload">Upload Images of Your Analysis Errors:</label>
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
                <button type="button" onClick={() => handleDeleteImage(index)} id='buts'>
                  <FaTrashAlt />
                </button>
              </div>
            ))}
          </div>
          <div className="form-group">
            <label htmlFor="description">What Are You Trying To Achieve?</label>
            <textarea
              id="description"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder='Please describe briefly your project, goals and objectives... MeanAs is here to help you solve the error very fast and accurately.'
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="option">Select The Specific Analysis Software:</label>
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
      <div className="response-container">
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

export default Errorchecker;
