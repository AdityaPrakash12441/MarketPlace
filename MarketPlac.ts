// Frontend for MarketPlac using React, Tailwind CSS, Axios, and TypeScript
// Now includes wishlist functionality synced with backend

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { loadStripe, Stripe } from '@stripe/stripe-js';

const socket = io('http://localhost:5000');
const stripePromise = loadStripe('your_stripe_publishable_key');

interface Product {
  _id: string;
  title: string;
  price: string;
  image: string;
}

interface User {
  name: string;
  email: string;
}

interface WishlistItem {
  _id: string;
  title: string;
  price: string;
  image: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>(localStorage.getItem('token') || '');
  const [listings, setListings] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [chatMessages, setChatMessages] = useState<{ sender: string, message: string }[]>([]);
  const [message, setMessage] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [form, setForm] = useState<{ name: string, email: string, password: string }>({ name: '', email: '', password: '' });
  const [newProduct, setNewProduct] = useState<{ title: string, price: string, image: string }>({ title: '', price: '', image: '' });
  const [search, setSearch] = useState<string>('');
  const [filteredListings, setFilteredListings] = useState<Product[]>([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/listings').then((res) => {
      setListings(res.data);
      setFilteredListings(res.data);
    });

    if (token) {
      axios.get('http://localhost:5000/api/wishlist', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => setWishlist(res.data));
    }

    socket.on('receiveMessage', (data) => {
      setChatMessages((prev) => [...prev, data]);
    });
  }, [token]);

  const handleAuth = async () => {
    if (isRegistering) {
      await axios.post('http://localhost:5000/api/register', form);
      setIsRegistering(false);
    } else {
      const res = await axios.post('http://localhost:5000/api/login', form);
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);

      const wishlistRes = await axios.get('http://localhost:5000/api/wishlist', {
        headers: { Authorization: `Bearer ${res.data.token}` },
      });
      setWishlist(wishlistRes.data);
    }
  };

  const sendMessage = () => {
    socket.emit('sendMessage', { room: 'general', message, sender: user?.name });
    setMessage('');
  };

  const handlePayment = async (price: string) => {
    const amount = parseInt(price.replace(/[^0-9]/g, '')) * 100;
    const res = await axios.post('http://localhost:5000/api/create-payment-intent', { amount }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const stripe: Stripe = await stripePromise;
    await stripe.redirectToCheckout({ sessionId: res.data.id });
  };

  const handleAddProduct = async () => {
    await axios.post('http://localhost:5000/api/listings', newProduct, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedListings = await axios.get('http://localhost:5000/api/listings');
    setListings(updatedListings.data);
    setFilteredListings(updatedListings.data);
    setNewProduct({ title: '', price: '', image: '' });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    const filtered = listings.filter(item =>
      item.title.toLowerCase().includes(e.target.value.toLowerCase())
    );
    setFilteredListings(filtered);
  };

  const toggleWishlist = async (item: Product) => {
    const exists = wishlist.find(w => w._id === item._id);
    if (exists) {
      await axios.delete(`http://localhost:5000/api/wishlist/${item._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlist(wishlist.filter(w => w._id !== item._id));
    } else {
      await axios.post('http://localhost:5000/api/wishlist', { itemId: item._id }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlist([...wishlist, item]);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">MarketPlac</h1>

      {/* ... unchanged content ... */}

    </div>
  );
}
