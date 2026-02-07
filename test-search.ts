
import { supabase } from './src/lib/supabase';

async function testSearch(query: string) {
  console.log(`Searching for "${query}"...`);

  const { data: files, error } = await supabase
    .from('files')
    .select('*')
    .ilike('title', `%${query}%`)
    .limit(5);

  if (error) {
    console.error("Search Error:", error);
    return;
  }

  if (!files || files.length === 0) {
    console.log("No files found.");
    return;
  }

  console.log(`Found ${files.length} files:`);
  for (const file of files) {
    console.log(`- ${file.title} (Path: ${file.storage_path})`);
    
    // Test Signed URL Generation
    const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.storage_path, 3600);

    if (signedUrlData) {
        console.log(`  Signed URL: ${signedUrlData.signedUrl}`);
    } else {
        console.log(`  Failed to generate URL: ${urlError?.message}`);
    }
  }
}

testSearch("IIT JAM");
