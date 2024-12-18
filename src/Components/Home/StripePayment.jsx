import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { loadStripe } from '@stripe/stripe-js';

const PaymentFlow = () => {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPlan = location.state?.plan;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchPlans();
      } else {
        navigate('/authentication');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('http://localhost:5000/stripe/plans');
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSubscribe = async (priceId) => {
    if (!user) {
      navigate('/authentication');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await loadStripe(process.env.STRIPE_SECRET_KEY);
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="payment-flow">
      <h1>Choose Your Plan</h1>
      <div className="plans-container">
        {plans.map((plan) => (
          <div key={plan.id} className="plan">
            <h2>{plan.product.name}</h2>
            <p>${plan.unit_amount / 100}/{plan.recurring.interval}</p>
            <button onClick={() => handleSubscribe(plan.id)}>Subscribe</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentFlow;
