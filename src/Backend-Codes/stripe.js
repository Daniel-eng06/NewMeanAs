// backend/stripe.js
import express from 'express';
import Stripe from 'stripe';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

// Middleware to verify Firebase token
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get available subscription plans
router.get('/plan', async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      active: true,
      type: 'recurring',
      expand: ['data.product']
    });
    
    res.json(prices.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create checkout session
router.post('/create-checkout-session', authenticateUser, async (req, res) => {
  const { priceId, userId, userEmail } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/plans`,
      customer_email: userEmail,
      metadata: {
        userId,
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle webhook events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle subscription events
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const userId = session.metadata.userId;
      
      await admin.firestore().collection('users').doc(userId).set({
        subscriptionStatus: 'active',
        subscriptionId: session.subscription,
        customerId: session.customer,
      }, { merge: true });
      break;
      
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      const subscriptionStatus = subscription.status;
      const customerId = subscription.customer;
      
      // Find user by customerId and update their status
      const userSnapshot = await admin.firestore()
        .collection('users')
        .where('customerId', '==', customerId)
        .get();
      
      if (!userSnapshot.empty) {
        const userId = userSnapshot.docs[0].id;
        await admin.firestore().collection('users').doc(userId).update({
          subscriptionStatus: subscriptionStatus
        });
      }
      break;
  }

  res.json({received: true});
});

// Get customer's subscription status
router.get('/subscription-status', authenticateUser, async (req, res) => {
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(req.user.uid)
      .get();
    
    if (!userDoc.exists) {
      return res.json({ status: 'no_subscription' });
    }
    
    const userData = userDoc.data();
    res.json({
      status: userData.subscriptionStatus,
      subscriptionId: userData.subscriptionId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post('/cancel-subscription', authenticateUser, async (req, res) => {
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(req.user.uid)
      .get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    const { subscriptionId } = userDoc.data();
    await stripe.subscriptions.del(subscriptionId);
    
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;