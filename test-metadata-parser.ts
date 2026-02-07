import { parseMetadataInput } from './src/lib/state';

// Test cases for metadata parsing
const testCases = [
  {
    name: "Full metadata",
    input: `name: Concepts of Physics Vol 1
author: HC Verma
subject: Physics
exam: JEE Advanced
year: 2024
edition: 5th Edition
semester: 1st Sem`,
    expected: {
      title: "Concepts of Physics Vol 1",
      author: "HC Verma",
      subject: "Physics",
      exam: "JEE Advanced",
      year: 2024,
      edition: "5th Edition",
      semester: "1st Sem"
    }
  },
  {
    name: "Partial metadata",
    input: `name: Math Textbook
subject: Mathematics
year: 2023`,
    expected: {
      title: "Math Textbook",
      subject: "Mathematics",
      year: 2023
    }
  },
  {
    name: "Alternative key names",
    input: `title: Chemistry Notes
topic: Organic Chemistry
yr: 2022`,
    expected: {
      title: "Chemistry Notes",
      subject: "Organic Chemistry",
      year: 2022
    }
  }
];

console.log("Testing metadata parser...\n");

for (const testCase of testCases) {
  console.log(`Test: ${testCase.name}`);
  const result = parseMetadataInput(testCase.input);
  
  // Check if result matches expected
  const success = JSON.stringify(result) === JSON.stringify(testCase.expected);
  
  if (success) {
    console.log("✅ PASSED");
  } else {
    console.log("❌ FAILED");
    console.log("Expected:", testCase.expected);
    console.log("Got:", result);
  }
  console.log();
}

console.log("All tests completed!");
