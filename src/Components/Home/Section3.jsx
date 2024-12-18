import React from "react";
import "./Section3.css"

function Workprocess() {
    const quo ={
        quote:"quote.png"
    }
    return(
        <div>
            <div className="section3">
                <h1>How Does It Work?</h1>
                <div className="steps">
                    <div id="process">
                        <h2>The Heading of the Step</h2>
                        <p>The steps to go about the Processes will be shown here</p>
                    </div>
                    <div><img src="#" alt=""/></div>
                </div>
                <div className="steps1">
                    <div><img src="#" alt=""/></div>
                    <div id="process">
                        <h2>The Heading of the Step</h2>
                         <p>The steps to go about the Processes will be shown here</p>
                    </div>
                </div>
                <div className="testimony">
                    <div><img src={quo.quote}/></div>
                    <p id="testa">Amidst confusion over FEA/CFD analysis during my internship, MeanAs provided invaluable clarity from start to finish. Their expert guidance enabled me to deliver high-quality results swiftly, impressing my boss and aligning my research with stringent deadlines.
                        MeanAs not only enhanced my understanding but also elevated <br/> my project's credibility, ensuring a successful outcome and advancing my career in engineering analysis.</p>
                    <p id="testam">Dan Hills</p>
                </div>
            </div>
        </div>
    )
}

export default Workprocess;