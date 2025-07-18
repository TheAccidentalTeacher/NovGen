#!/usr/bin/env node

/**
 * MongoDB Connection Diagnostic Script
 * Run this to test MongoDB connectivity
 */

import mongoose from 'mongoose';

async function diagnoseConnection() {
  console.log('🔍 MongoDB Connection Diagnostic');
  console.log('================================');
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('PORT:', process.env.PORT || 'not set');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
  
  if (!process.env.MONGODB_URI) {
    console.log('\n❌ MONGODB_URI is not set!');
    console.log('You need to set this environment variable.');
    console.log('\nFor MongoDB Atlas, it should look like:');
    console.log('mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority');
    process.exit(1);
  }
  
  // Attempt connection
  console.log('\n🔗 Testing MongoDB Connection...');
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      connectTimeoutMS: 10000,
    });
    
    console.log('✅ MongoDB connection successful!');
    console.log('Database name:', mongoose.connection.db?.databaseName);
    console.log('Host:', mongoose.connection.host);
    console.log('Port:', mongoose.connection.port);
    console.log('Ready state:', mongoose.connection.readyState);
    
    await mongoose.connection.close();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.log('❌ MongoDB connection failed!');
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.log('\n🔍 Error Analysis:');
      
      if (error.message.includes('authentication failed')) {
        console.log('- Authentication issue: Check username/password');
      }
      
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        console.log('- DNS/Network issue: Check connection string hostname');
      }
      
      if (error.message.includes('timeout')) {
        console.log('- Timeout issue: Check network connectivity or firewall');
      }
      
      if (error.message.includes('IP whitelist')) {
        console.log('- IP whitelist issue: Add Railway IPs to MongoDB Atlas');
      }
    }
    
    process.exit(1);
  }
}

// Run the diagnostic
diagnoseConnection().catch(console.error);
