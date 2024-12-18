import React from "react";
import "./Section4.css";
import {Link} from "react-router-dom";
import { analytics } from '../../firebase';
import { logEvent } from "firebase/analytics";

function Billing() {
    const handleLinkClick = (linkPrice) => {
        // Log the click event with a specific link name
        logEvent(analytics, 'link_click', { link_price: linkPrice });
      };
    const img ={
        spot:"record.png",
        spot1:"record (1).png",
        spot2:"record (2).png",
        spot3:"check-mark.png"
    }
    return(
        <div className="section4">
            <h1>How Can You Get Started?</h1>
            <div className="bill">
                <div id='free'>
                    <div className="spo">
                        <div id="spot"><img src={img.spot} alt=""/></div>
                        <h3 id="blue">Explorer Plan</h3>
                    </div>
                    <p id="price">Free<span>/14 Days </span></p>
                    <ul className="pack">
                        <li id="pri"><p>Explorer plan includes:</p></li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Access to all AI-powered features</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>5 GB storage</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Limited to 5 analysis projects per day</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Clarity & Accuracy For Pre-Processing</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Clarity & Accuracy For Post-Processing</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>FEA/CFD Analysis Error Solutions</li>
                        </ul>
                        <Link className="go" to="/authentication" state={{ plan: "Explorer Plan" }} onClick={() => handleLinkClick('Try For Free')}>Try For Free</Link>
                    </div>

                    <div id="unique">
                        <p id="popu">Most Popular</p>
                        <div className="spo">
                            <div id="spot"><img src={img.spot2} alt=""/></div>
                            <h3 id="orange">Standard Plan</h3>
                        </div>
                        <p id="price">$19.99<span>/month, billed annually</span></p>
                        <ul className="pack">
                        <li id="pri"><p>Standard plan includes:</p></li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Access to all AI-powered features</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>20 GB storage</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Limited to 20 analysis projects per month</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Clarity & Accuracy For Pre-Processing</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Clarity & Accuracy For Post-Processing</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>FEA/CFD Analysis Error Solutions</li>
                        </ul>
                        <Link className="go1" to="/paymentflow" state={{ plan: "Standard Plan" }} onClick={() => handleLinkClick('Get Started')}>Get Started</Link>
                    </div>

                    <div id='pro'>
                        <div className="spo">
                            <div id="spot"><img src={img.spot1} alt=""/></div>
                            <h3 id="green">Unlimited Plan</h3>
                        </div>
                        <p id="price">$49.99<span>/month, billed annually</span></p>
                        <ul className="pack">
                        <li id="pri"><p>Unlimited plan includes:</p></li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Access to all AI-powered features</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Unlimited storage</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Unlimited analysis projects per month</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Clarity & Accuracy For Pre-Processing</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>Clarity & Accuracy For Post-Processing</li>
                        <li id="pri"><div><img src={img.spot3} alt=""/></div>FEA/CFD Analysis Error Solutions</li>
                        </ul>
                        <Link className="go" to="/paymentflow" state={{ plan: "Unlimited Plan" }} onClick={() => handleLinkClick('Go Unlimited')}>Go Unlimited</Link>
                    </div>
            </div>
        </div>
    )

}

export default Billing;