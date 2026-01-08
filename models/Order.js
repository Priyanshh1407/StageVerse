// models/Order.js
import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  // The "Receipt" ID (e.g., #TRX-88592)
  transactionId: { type: String, unique: true, required: true },
  
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  
  // Who bought it? (Link to User, but also store name snapshot in case they delete account)
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  buyerName: { type: String }, // "Sarah Jenkins"
  
  // What did they buy?
  items: [{
    tierName: { type: String }, // "VIP Admission"
    quantity: { type: Number, required: true },
    price: { type: Number, required: true } // Price *at time of purchase*
  }],
  
  totalAmount: { type: Number, required: true }, // $240
  
  status: { 
    type: String, 
    enum: ['Paid', 'Pending', 'Failed', 'Refunded'], 
    default: 'Pending' 
  },
  
  paymentMethod: { type: String, default: 'Credit Card' }
}, { timestamps: true }); // timestamps gives us the Purchase Date automatically

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);