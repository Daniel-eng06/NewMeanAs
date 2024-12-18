import React, { useState } from 'react';
import "./Post-process.css";
import Footer from "../Home/Footer";
import Grid from "../../Grid";
import Defaultbars from "./Defaultbars";
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaUpload, FaTrashAlt } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import axios from 'axios';

function Postprocess() {
    const vid = {
        vid1: "Gradient 2.mp4",
        post: "post-process.png",
    };

    const [images, setImages] = useState([]);
    const [goal, setGoal] = useState('');
    const [response, setResponse] = useState('');
    const [analysisType, setAnalysisType] = useState('');
    const [detailLevel, setDetailLevel] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages((prevImages) => [...prevImages, ...files]);
    };

    const handleDeleteImage = (index) => {
        setImages((prevImages) => prevImages.filter((_, i) => i !== index));
    };

    const handleDetailLevelChange = (e) => {
        const value = e.target.value;
        setDetailLevel((prevDetailLevel) =>
            prevDetailLevel.includes(value)
                ? prevDetailLevel.filter((level) => level !== value)
                : [...prevDetailLevel, value]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);


        //In here as well create a rule that fits into this perfectly
        if (images.length > 0 && goal && analysisType && detailLevel.length > 0) {
            try {
                // Upload images to Firebase Storage
                const imageUrls = await Promise.all(images.map(async (image) => {
                    const storageRef = ref(storage, `errors/${image.name}`);
                    await uploadBytes(storageRef, image);
                    return getDownloadURL(storageRef);
                }));

                // Send data to backend
                const response = await axios.post('/postprocess', {
                    goal,
                    imageUrls,
                    analysisType,
                    detailLevel,
                });

                // Handle backend response
                const { id, response: generatedResponse } = response.data;

                // Update component state
                setImages([]);
                setGoal('');
                setAnalysisType('');
                setDetailLevel([]);
                setResponse(generatedResponse);

            } catch (error) {
                console.error("Error uploading file or sending data", error);
            } finally {
                setLoading(false);
            }
        } else {
            alert('Please upload images, enter your goal, select an analysis type, and choose the level of detail.');
            setLoading(false);
        }
    };

    const generatePDF = async () => {
        const doc = new jsPDF();
        doc.text("Post-Process Report", 10, 10);
        doc.text(`Goal: ${goal}`, 10, 20);
        doc.text(`Analysis Type: ${analysisType}`, 10, 30);
        doc.text(`Detail Level: ${detailLevel.join(", ")}`, 10, 40);

        // Adding response to the PDF
        const responseLines = response.split('\n');
        let yOffset = 50;
        responseLines.forEach(line => {
            doc.text(line, 10, yOffset);
            yOffset += 10;
        });

        const pdfBlob = doc.output("blob");


        //we have to create a specific firebase rule for the storage and firestore for this.
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
        URL.revokeObjectURL(pdfBlobURL); // Cleanup

        alert(`Report generated and uploaded successfully! URL: ${pdfURL}`);
    };

    return (
        <div id='err1'>
            <video id="background-video"
                src={vid.vid1} controls loop autoPlay muted>
            </video>
            <Grid/>
            <Defaultbars/>
            <div className='current'>
                <div><img src={vid.post} alt="Post-process" /></div>
                <h2>Clarity & Accuracy For Post-Processing</h2>
            </div>
            <div className="errorcheck">
                <form onSubmit={handleSubmit} className="image-form">
                    <div className="form-group">
                        <label htmlFor="imageUpload">Upload Images/Plots of Your Outcomes for Interpretation:</label>
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
                        <label htmlFor="description">Provide the materials used for your FEA/CFD Analysis: </label>
                        <textarea
                            id="description"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder='Please provide all the materials used for your specific FEA/CFD analysis from pre-processing...'
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="detailLevel">What level of details do you require in the explanation?</label>
                        <div className="checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    value="High Student-level insight"
                                    checked={detailLevel.includes('High Student-level insight')}
                                    onChange={handleDetailLevelChange}
                                />
                                High Student Level
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    value="Detailed technical insight"
                                    checked={detailLevel.includes('Detailed technical insight')}
                                    onChange={handleDetailLevelChange}
                                />
                                Detailed Technical Insight
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    value="Marketing-level insight"
                                    checked={detailLevel.includes('Marketing-level insight')}
                                    onChange={handleDetailLevelChange}
                                />
                                Marketing Level
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    value="Research-level insight"
                                    checked={detailLevel.includes('Research-level insight')}
                                    onChange={handleDetailLevelChange}
                                />
                                Research Level 
                            </label>
                        </div>
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

export default Postprocess;
