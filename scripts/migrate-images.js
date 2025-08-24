// scripts/migrate-images.js - WITHOUT makePublic() calls
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config({ path: '.env.local' });

let fetch;

async function initializeFetch() {
  if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
    console.log('Using built-in fetch');
  } else {
    const { default: nodeFetch } = await import('node-fetch');
    fetch = nodeFetch;
    console.log('Using node-fetch');
  }
}

// Firebase initialization
const serviceAccount = {
  type: "service_account",
  project_id: process.env.AUTH_FIREBASE_PROJECT_ID,
  private_key_id: process.env.AUTH_FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.AUTH_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.AUTH_FIREBASE_CLIENT_EMAIL,
  client_id: process.env.AUTH_FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.AUTH_FIREBASE_CLIENT_X509_CERT_URL
};

console.log('✅ Initializing Firebase Admin...');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('✅ Initializing Google Cloud Storage...');
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: {
    client_email: process.env.GCS_CLIENT_EMAIL,
    private_key: process.env.GCS_PRIVATE_KEY?.split(String.raw`\n`).join('\n'),
  },
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

async function migrateImages() {
  try {
    console.log('🚀 Starting image migration from Cloudinary to Google Cloud Storage...');
    
    await initializeFetch();
    
    // Test GCS connection
    try {
      await bucket.getMetadata();
      console.log('✅ GCS connection successful');
    } catch (gcsError) {
      console.error('❌ GCS connection failed:', gcsError.message);
      return;
    }
    
    // Get all products
    const productsSnapshot = await db.collection('products').get();
    console.log(`📦 Found ${productsSnapshot.docs.length} products to process`);
    
    let totalMigrated = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    
    for (const doc of productsSnapshot.docs) {
      const productData = doc.data();
      const productId = doc.id;
      
      if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
        console.log(`\n🔄 Processing product: ${productId} (${productData.name || 'Unnamed'})`);
        console.log(`   Images to migrate: ${productData.images.length}`);
        
        const newImageUrls = [];
        
        for (let i = 0; i < productData.images.length; i++) {
          const currentUrl = productData.images[i];
          
          // Skip if already migrated
          if (currentUrl.includes('storage.googleapis.com') || currentUrl.includes('storage.cloud.google.com')) {
            console.log(`   ⏭️  Already migrated: Image ${i + 1}`);
            newImageUrls.push(currentUrl);
            totalSkipped++;
            continue;
          }
          
          if (!currentUrl.includes('res.cloudinary.com')) {
            console.log(`   ⏭️  Not a Cloudinary URL: Image ${i + 1}`);
            newImageUrls.push(currentUrl);
            totalSkipped++;
            continue;
          }
          
          try {
            console.log(`   📥 Downloading image ${i + 1}/${productData.images.length}...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);
            
            const response = await fetch(currentUrl, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const fileSizeKB = Math.round(buffer.length / 1024);
            console.log(`   📊 Downloaded ${fileSizeKB}KB`);
            
            // Determine file extension
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            let fileExtension = 'jpg';
            
            if (contentType.includes('png')) fileExtension = 'png';
            else if (contentType.includes('webp')) fileExtension = 'webp';
            else if (contentType.includes('gif')) fileExtension = 'gif';
            else if (currentUrl.includes('.png')) fileExtension = 'png';
            else if (currentUrl.includes('.webp')) fileExtension = 'webp';
            else if (currentUrl.includes('.gif')) fileExtension = 'gif';
            
            // Generate unique filename
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const newFileName = `aahanya-products/${productId}-img-${i + 1}-${timestamp}-${randomSuffix}.${fileExtension}`;
            
            // Upload to GCS without making public
            console.log(`   ⬆️  Uploading to GCS as: ${newFileName}`);
            const file = bucket.file(newFileName);
            
            await file.save(buffer, {
              metadata: {
                contentType: contentType,
                cacheControl: 'public, max-age=31536000',
                metadata: {
                  originalUrl: currentUrl,
                  productId: productId,
                  migratedAt: new Date().toISOString()
                }
              },
              // ✅ Remove public: true to avoid the error
              validation: 'md5',
              resumable: false,
            });
            
            // ✅ Don't call makePublic() to avoid the 412 error
            // Instead, generate URL using signed URLs or configure bucket permissions
            
            const newUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${newFileName}`;
            newImageUrls.push(newUrl);
            
            console.log(`   ✅ Migration successful!`);
            console.log(`      New URL: ${newUrl.substring(0, 80)}...`);
            
            totalMigrated++;
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            console.error(`   ❌ Failed to migrate image ${i + 1}:`, error.message);
            newImageUrls.push(currentUrl);
            totalErrors++;
          }
        }
        
        // Update product with new URLs
        try {
          await db.collection('products').doc(productId).update({
            images: newImageUrls,
            migratedAt: admin.firestore.FieldValue.serverTimestamp(),
            storageProvider: 'gcs',
            migrationVersion: '1.0'
          });
          
          console.log(`   💾 Updated product database record`);
        } catch (updateError) {
          console.error(`   ❌ Failed to update product ${productId}:`, updateError.message);
        }
      } else {
        console.log(`⏭️  Skipping product ${productId}: No images found`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`\n📊 Final Summary:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   📦 Total products processed: ${productsSnapshot.docs.length}`);
    console.log(`   ✅ Images successfully migrated: ${totalMigrated}`);
    console.log(`   ⏭️  Images already migrated/skipped: ${totalSkipped}`);
    console.log(`   ❌ Migration errors: ${totalErrors}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    if (totalMigrated > 0) {
      console.log('\n⚠️  Important: Your images are uploaded but not public yet.');
      console.log('   To make them publicly accessible:');
      console.log('   1. Go to Cloud Console → Storage → Buckets');
      console.log('   2. Click on your bucket → Permissions tab');
      console.log('   3. Click "Allow public access"');
      console.log('   4. Or run: gcloud storage buckets update gs://aahanya-creatives-images --no-public-access-prevention');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    console.log('\n🧹 Migration script completed. Exiting...');
    process.exit(0);
  }
}

console.log('🚀 Starting Aahanya Creatives Image Migration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
migrateImages();
