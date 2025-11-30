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

    if (contentType.includes('multipart/form-data')) {
      // Handle PDF upload
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        throw new Error('No file uploaded');
      }

      // Read PDF as text (simplified - in production you'd use a proper PDF parser)
      const arrayBuffer = await file.arrayBuffer();
      const textDecoder = new TextDecoder();
      fileContent = textDecoder.decode(arrayBuffer);
      fileType = 'pdf';
    } else {
      // Handle JSON request with CSV content
      const body = await req.json();
      fileContent = body.fileContent;
      fileType = body.fileType || 'csv';
    }

    // Use AI to extract product information
    const systemPrompt = `You are a data extraction assistant for an electrical supplies business. Extract product information from wholesale price lists and catalogs.

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

Return ONLY a valid JSON array of products. Each product should be an object with the fields above. If a field is not found, omit it or set it to null.

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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract product information from this ${fileType.toUpperCase()} file content:\n\n${fileContent.substring(0, 50000)}` }
        ],
        temperature: 0.3,
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
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        products = JSON.parse(jsonMatch[0]);
      } else {
        products = JSON.parse(aiResponse);
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