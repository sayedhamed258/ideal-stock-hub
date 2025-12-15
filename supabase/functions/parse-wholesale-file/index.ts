import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const contentType = req.headers.get('content-type') || '';
    let fileContent = '';
    let fileType = 'csv';
    let fileBase64 = '';
    let fileMimeType = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        throw new Error('No file uploaded');
      }

      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      
      if (fileName.endsWith('.pdf')) {
        // For PDFs, convert to base64 for multimodal AI processing
        fileType = 'pdf';
        fileMimeType = 'application/pdf';
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        fileBase64 = btoa(binary);
      } else {
        // For CSV/text files, decode as text
        fileType = 'csv';
        const textDecoder = new TextDecoder();
        fileContent = textDecoder.decode(arrayBuffer);
      }
    } else {
      // Handle JSON request with CSV content
      const body = await req.json();
      fileContent = body.fileContent;
      fileType = body.fileType || 'csv';
    }

    const systemPrompt = `You are a data extraction assistant for an electrical supplies business. Extract ALL product information from wholesale price lists and catalogs.

CRITICAL: You MUST extract EVERY SINGLE PRODUCT from the file. Do not skip any products. Do not summarize or truncate the list. Extract all products even if there are hundreds of them.

Extract the following fields for each product:
- name: Product name
- product_id: Product ID/code if available
- category: Product category (e.g., Cables, Switches, MCB, etc.)
- supplier: Supplier name if mentioned
- purchase_price: Purchase/wholesale price
- selling_price: Selling/retail price (if different from purchase)
- mrp_price: MRP price if mentioned
- without_tax_price: Price without tax if mentioned
- stock_qty: Stock quantity if mentioned
- unit: Unit of measurement (pieces, meters, box, etc.)
- barcode: Barcode if available
- item_code: Item code if available
- description: Brief description if available
- packing_inner: Packing information if available
- packing_final_price: Final packing price if available

Return ONLY a valid JSON array with ALL products. Each product should be an object with the fields above. If a field is not found, omit it or set it to null.

IMPORTANT: Extract ALL products from the document. Do not limit or truncate the output.

Example format:
[
  {
    "name": "MCB 32A Single Pole",
    "category": "MCB",
    "supplier": "Havells",
    "selling_price": 150,
    "unit": "pieces"
  }
]`;

    // Build messages based on file type
    let messages: any[];
    if (fileType === 'pdf' && fileBase64) {
      // Use multimodal input for PDFs
      messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: 'Extract all product information from this wholesale price list PDF document.' },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:${fileMimeType};base64,${fileBase64}` 
              } 
            }
          ]
        }
      ];
    } else {
      // Text-based input for CSV
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract ALL product information from this CSV file. Do not skip any products:\n\n${fileContent.substring(0, 200000)}` }
      ];
    }

    console.log(`Processing ${fileType} file with ${fileType === 'pdf' ? 'multimodal' : 'text'} input`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to process file with AI');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse the JSON response
    let products = [];
    try {
      // Remove markdown code fences if present
      let cleanedResponse = aiResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      
      // Try to extract JSON array from the response
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        products = JSON.parse(jsonMatch[0]);
      } else {
        products = JSON.parse(cleanedResponse);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to extract product data. Please ensure the file contains product information.');
    }

    return new Response(
      JSON.stringify({ products }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-wholesale-file function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});