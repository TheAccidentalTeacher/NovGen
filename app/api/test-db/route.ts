import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔄 Testing database connection...');
    
    // Check environment variables
    const mongoUri = process.env.MONGODB_URI;
    console.log('MongoDB URI exists:', !!mongoUri);
    
    if (!mongoUri) {
      return NextResponse.json({ 
        error: 'MONGODB_URI not found',
        env: Object.keys(process.env).filter(key => key.includes('MONGO'))
      }, { status: 500 });
    }
    
    // Try to import database module
    const { connectToDatabase } = await import('@/lib/database');
    console.log('✅ Database module imported');
    
    // Try to connect
    const db = await connectToDatabase();
    console.log('✅ Database connected');
    
    // Try to get a collection
    const collection = db.collection('test');
    console.log('✅ Collection created');
    
    return NextResponse.json({ 
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json({ 
      error: 'Database test failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
