# Grammar Checking System Revamp Summary

## Overview
The grammar checking system has been revamped to use Named Entity Recognition (NER) masking and improved sentence boundary detection. This prevents false positives on proper nouns and handles edge cases like abbreviations correctly.

## Key Changes

### 1. New Dependencies Installed
```bash
pnpm add compromise sentence-splitter
```
- **compromise**: NLP library for Named Entity Recognition
- **sentence-splitter**: Advanced sentence boundary detection

### 2. New Text Processing Module
Created `lib/textProcessing.ts` with the following features:

#### Named Entity Recognition (NER) Masking
- Identifies and masks: people, places, organizations, dates, URLs
- Replaces entities with placeholders: `<ENTITY_PERSON_0>`, `<ENTITY_PLACE_1>`, etc.
- Prevents GPT from suggesting corrections on proper nouns

#### Improved Sentence Splitting
- Uses `sentence-splitter` library instead of regex
- Correctly handles abbreviations (Mr., Mrs., Dr., Ph.D., etc.)
- Avoids splitting at decimal points, URLs, and other edge cases

#### Intelligent Text Chunking
- Groups text into chunks of 2-3 sentences (configurable)
- Maintains better context for grammar analysis
- Reduces the number of API calls while improving accuracy

### 3. Updated GPT Check Route
Modified `app/api/gpt-check/route.ts`:

#### Changes Made:
1. **Reduced chunk size**: From 5 sentences to 3 sentences per chunk
2. **Integrated NER masking**: Text is masked before sending to GPT
3. **Updated system prompt**: Informs GPT about entity placeholders
4. **Position adjustment**: Correctly maps error positions after unmasking
5. **Better error handling**: Handles sub-chunks when text exceeds limits

#### New Processing Flow:
```
1. Text Input → Sentence Splitting → Chunking (2-3 sentences)
2. Each Chunk → NER Masking → Send to GPT
3. GPT Response → Adjust Positions → Unmask Entities → Return Errors
```

## Benefits

### 1. Fewer False Positives
- Proper nouns are protected by NER masking
- No more suggestions to "correct" names, places, or organizations

### 2. Better Context Understanding
- Multi-sentence chunks provide better context
- GPT can make more informed decisions about grammar

### 3. Improved Sentence Handling
- Abbreviations like "Mrs. Smith" won't be split incorrectly
- Complex punctuation patterns are handled properly

### 4. Configurable Behavior
- Chunk size can be adjusted via environment variable
- `GPT_CHECK_SENTENCES_PER_CHUNK` (default: 3)

## Example Usage

### Before (Old System):
```
Input: "Mrs. Smith went to New York."
Problems:
- Might split at "Mrs." incorrectly
- Might suggest corrections for "New York"
```

### After (New System):
```
Input: "Mrs. Smith went to New York."
Processing:
1. Correctly identified as single sentence
2. "Smith" → <ENTITY_PERSON_0>
3. "New York" → <ENTITY_PLACE_1>
4. Sent to GPT: "Mrs. <ENTITY_PERSON_0> went to <ENTITY_PLACE_1>."
5. No false corrections on proper nouns
```

## Configuration

### Environment Variables:
- `GPT_CHECK_SENTENCES_PER_CHUNK`: Number of sentences per chunk (default: 3)
- `GPT_CHECK_CHUNK_SIZE`: Maximum characters per chunk (default: 16000)

### How to Test:
1. Start the development server: `pnpm dev`
2. Create or edit a document
3. Test with text containing:
   - Abbreviations (Mr., Dr., etc.)
   - Proper nouns (names, places)
   - Multi-sentence paragraphs
   - Intentional grammar errors

## Technical Details

### NER Categories Masked:
- **People**: Names of individuals
- **Places**: Locations, cities, countries
- **Organizations**: Companies, institutions
- **Dates**: Temporal expressions
- **URLs**: Web addresses

### Position Tracking:
The system maintains accurate position tracking through:
1. Chunk offsets: Track where each chunk starts in the original text
2. Entity position mapping: Track where entities were replaced
3. Sub-chunk handling: For text exceeding maximum chunk size
4. Final position adjustment: Maps errors back to original text positions

## Future Enhancements
- Add support for more entity types (products, monetary values)
- Implement caching for repeated text chunks
- Add language detection for multi-language support
- Provide confidence scores for suggestions 