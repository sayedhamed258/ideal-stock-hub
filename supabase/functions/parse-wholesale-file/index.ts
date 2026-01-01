import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Papa from "https://esm.sh/papaparse@5.5.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Zod schema for validating AI-parsed product data
const ProductSchema = z.object({
  name: z.string().min(1).max(500),
  product_id: z.string().max(100).optional().nullable(),
  category: z.string().max(200).optional().nullable(),
  supplier: z.string().max(200).optional().nullable(),
  purchase_price: z.number().min(0).max(100000000).optional().nullable(),
  selling_price: z.number().min(0).max(100000000).optional().nullable(),
  mrp_price: z.number().min(0).max(100000000).optional().nullable(),
  without_tax_price: z.number().min(0).max(100000000).optional().nullable(),
  stock_qty: z.number().int().min(0).max(100000000).optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  item_code: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  packing_inner: z.string().max(100).optional().nullable(),
  packing_final_price: z.union([z.string().max(100), z.number().min(0).max(100000000)]).optional().nullable(),
});

const ProductArraySchema = z.array(ProductSchema);

// Validate and sanitize AI-parsed products
const validateAndSanitizeProducts = (rawProducts: unknown[]): z.infer<typeof ProductArraySchema> => {
  const validProducts: z.infer<typeof ProductArraySchema> = [];
  
  for (const product of rawProducts) {
    try {
      // Parse and validate each product
      const validated = ProductSchema.parse(product);
      validProducts.push(validated);
    } catch (e) {
      // Skip invalid products but log the issue
      console.warn('Skipping invalid product:', e instanceof Error ? e.message : 'Unknown validation error');
    }
  }
  
  return validProducts;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[\s._\-()]+/g, "");

const pickHeader = (headers: string[], candidates: string[]) => {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const wanted = candidates.map(normalizeHeader);

  for (const w of wanted) {
    const hit = normalized.find((h) => h.norm === w);
    if (hit) return hit.raw;
  }
  for (const w of wanted) {
    const hit = normalized.find((h) => h.norm.includes(w) || w.includes(h.norm));
    if (hit) return hit.raw;
  }
  return null;
};

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/[,₹$]/g, "").replace(/\s+/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const toInt = (v: unknown): number | null => {
  const n = toNumber(v);
  if (n === null) return null;
  return Math.trunc(n);
};

const toText = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
};

// Check if a value looks like a product name (text with letters)
const looksLikeProductName = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  if (!s || s.length < 2) return false;
  // Must contain some letters
  return /[a-zA-Z]/.test(s);
};

// Check if a value looks like a price (numeric, possibly with currency symbols)
const looksLikePrice = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  if (!s) return false;
  const cleaned = s.replace(/[,₹$\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 && n < 10000000;
};

// Detect column types by analyzing sample data
const detectColumnTypes = (rows: Record<string, unknown>[], headers: string[]) => {
  const columnStats: Record<string, { textCount: number; priceCount: number; emptyCount: number; samples: string[] }> = {};
  
  for (const h of headers) {
    columnStats[h] = { textCount: 0, priceCount: 0, emptyCount: 0, samples: [] };
  }
  
  // Analyze first 100 rows to detect column types
  const sampleRows = rows.slice(0, 100);
  for (const row of sampleRows) {
    for (const h of headers) {
      const val = row[h];
      if (val === null || val === undefined || String(val).trim() === '') {
        columnStats[h].emptyCount++;
      } else if (looksLikePrice(val)) {
        columnStats[h].priceCount++;
      } else if (looksLikeProductName(val)) {
        columnStats[h].textCount++;
        if (columnStats[h].samples.length < 3) {
          columnStats[h].samples.push(String(val).trim().substring(0, 50));
        }
      }
    }
  }
  
  return columnStats;
};

const tryExtractProductsFromCsv = (content: string) => {
  // First, try parsing without header to detect structure
  const rawParsed = Papa.parse<string[]>(content, {
    header: false,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  
  const rawData = rawParsed.data ?? [];
  if (rawData.length < 2) return [];
  
  // Find the header row (first row with multiple non-empty text values)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    const nonEmptyCount = row.filter(v => v && String(v).trim().length > 0).length;
    const textCount = row.filter(v => v && /[a-zA-Z]/.test(String(v))).length;
    
    // If row has at least 3 text values, it's likely the header or data row
    if (nonEmptyCount >= 3 && textCount >= 2) {
      headerRowIndex = i;
      break;
    }
  }
  
  // Generate headers (use row values if they look like headers, otherwise use column indices)
  const headerRow = rawData[headerRowIndex];
  const headers: string[] = headerRow.map((v, idx) => {
    const val = String(v ?? '').trim();
    if (val && val.length > 0 && val.length < 50) {
      return val;
    }
    return `Col_${idx}`;
  });
  
  console.log("Detected headers at row", headerRowIndex, ":", headers);
  
  // Parse again with headers
  const parsed = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h, idx) => {
      // Handle empty or duplicate headers
      const trimmed = (h ?? '').trim();
      if (!trimmed || trimmed === '' || trimmed.toLowerCase().startsWith('unnamed')) {
        return `Col_${idx}`;
      }
      return trimmed;
    }
  });

  const parsedHeaders = parsed.meta.fields ?? [];
  console.log("CSV Headers found:", parsedHeaders);
  if (!parsedHeaders.length) return [];

  const rows = (parsed.data ?? []).filter((r) => r && Object.keys(r).length);
  console.log("Total rows parsed:", rows.length);
  
  // Detect column types
  const columnStats = detectColumnTypes(rows, parsedHeaders);
  console.log("Column analysis:", JSON.stringify(columnStats, null, 2));
  
  // Find name column (highest text count that isn't mostly empty)
  let hName = pickHeader(parsedHeaders, ["name", "productname", "item", "itemname", "particulars", "product", "material", "goods"]);
  
  if (!hName) {
    // Auto-detect: find column with most text values
    let bestNameCol = null;
    let bestTextCount = 0;
    for (const [col, stats] of Object.entries(columnStats)) {
      const fillRate = (stats.textCount / rows.length) * 100;
      if (stats.textCount > bestTextCount && fillRate > 30) {
        bestTextCount = stats.textCount;
        bestNameCol = col;
      }
    }
    if (bestNameCol) {
      hName = bestNameCol;
      console.log("Auto-detected name column:", hName, "samples:", columnStats[hName].samples);
    }
  }
  
  if (!hName) {
    console.log("Could not find name column");
    return [];
  }

  // Find price columns
  const priceColumns: string[] = [];
  for (const [col, stats] of Object.entries(columnStats)) {
    const priceRate = (stats.priceCount / rows.length) * 100;
    if (priceRate > 30) {
      priceColumns.push(col);
    }
  }
  console.log("Detected price columns:", priceColumns);

  const hProductId = pickHeader(parsedHeaders, ["productid", "productcode", "code", "sku", "itemcode", "item_code", "id", "srno", "sr_no", "sno", "sl", "slno"]);
  const hCategory = pickHeader(parsedHeaders, ["category", "group", "type"]);
  const hSupplier = pickHeader(parsedHeaders, ["supplier", "brand", "make", "company"]);
  
  // Try standard header matching first, then fall back to detected price columns
  let hPurchase = pickHeader(parsedHeaders, ["purchaseprice", "purchase_price", "rate", "cost", "wholesale", "net", "netrate", "net_rate", "dealerprice", "dealer_price", "dp", "basicrate", "basic_rate", "basicprice", "basic", "dlp"]);
  let hSelling = pickHeader(parsedHeaders, ["sellingprice", "selling_price", "saleprice", "price", "retail", "sp", "retailprice", "retail_price"]);
  let hMrp = pickHeader(parsedHeaders, ["mrp", "mrpprice", "mrp_price", "listprice", "list_price", "maximumretailprice"]);
  let hWithoutTax = pickHeader(parsedHeaders, ["withouttaxprice", "without_tax_price", "taxablevalue", "baseprice", "taxable", "beforetax", "excltax", "excl_tax", "nettaxable", "net_taxable"]);
  
  // If no price columns found via header matching, use auto-detected price columns
  if (!hPurchase && !hSelling && !hMrp && priceColumns.length > 0) {
    // Assign first detected price column as purchase/selling price
    hSelling = priceColumns[0];
    if (priceColumns.length > 1) {
      hMrp = priceColumns[1];
    }
    console.log("Using auto-detected price columns - Selling:", hSelling, "MRP:", hMrp);
  }
  
  const hQty = pickHeader(parsedHeaders, ["qty", "quantity", "stock", "stockqty", "stock_qty", "balance", "available", "instock", "in_stock", "closing", "closingstock", "closing_stock"]);
  const hUnit = pickHeader(parsedHeaders, ["unit", "uom"]);
  const hBarcode = pickHeader(parsedHeaders, ["barcode", "ean", "upc"]);
  const hItemCode = pickHeader(parsedHeaders, ["itemcode", "item_code", "partno", "part_no", "articlenumber", "article_no"]);
  const hDesc = pickHeader(parsedHeaders, ["description", "desc", "details", "specification", "specs"]);
  const hPackInner = pickHeader(parsedHeaders, ["packinginner", "packing_inner", "innerpack", "inner", "packof", "pack_of", "moq", "minqty", "packing"]);
  const hPackFinal = pickHeader(parsedHeaders, ["packingfinalprice", "packing_final_price", "packprice", "packingprice", "finalprice", "boxprice", "box_price"]);

  console.log("Final mapped headers:", { hName, hProductId, hPurchase, hSelling, hMrp, hWithoutTax, hQty, hPackInner, hPackFinal });

  const products = rows
    .map((r) => {
      const name = toText(r[hName!]);
      if (!name || name.length < 2) return null;
      
      // Skip rows that look like headers or totals
      const nameLower = name.toLowerCase();
      if (nameLower.includes('total') || nameLower.includes('grand total') || 
          nameLower === 'name' || nameLower === 'product name' || nameLower === 'item' ||
          nameLower === 'particulars' || nameLower === 'description') {
        return null;
      }

      const product: Record<string, unknown> = {
        name,
        product_id: hProductId ? toText(r[hProductId]) : null,
        category: hCategory ? toText(r[hCategory]) : null,
        supplier: hSupplier ? toText(r[hSupplier]) : null,
        purchase_price: hPurchase ? toNumber(r[hPurchase]) : null,
        selling_price: hSelling ? toNumber(r[hSelling]) : null,
        mrp_price: hMrp ? toNumber(r[hMrp]) : null,
        without_tax_price: hWithoutTax ? toNumber(r[hWithoutTax]) : null,
        stock_qty: hQty ? toInt(r[hQty]) : null,
        unit: hUnit ? toText(r[hUnit]) : null,
        barcode: hBarcode ? toText(r[hBarcode]) : null,
        item_code: hItemCode ? toText(r[hItemCode]) : null,
        description: hDesc ? toText(r[hDesc]) : null,
        packing_inner: hPackInner ? toText(r[hPackInner]) : null,
        packing_final_price: hPackFinal ? toText(r[hPackFinal]) : null,
      };

      // Remove nulls to keep payload small/clean
      for (const k of Object.keys(product)) {
        if (product[k] === null) delete product[k];
      }

      return product;
    })
    .filter(Boolean) as Record<string, unknown>[];

  return products;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication and role
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.warn('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user token and get user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      console.warn('Invalid or expired token:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has write permissions (admin or staff role)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'staff'])
      .limit(1);

    if (roleError || !roleData || roleData.length === 0) {
      console.warn('User does not have write permissions:', user.id);
      return new Response(
        JSON.stringify({ error: 'You do not have permission to import files. Admin or staff role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authorized user ${user.id} with role ${roleData[0].role} is processing file`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const contentType = req.headers.get('content-type') || '';
    let fileContent = '';
    let fileType = 'csv';
    let fileBase64 = '';
    let fileMimeType = '';

    // Maximum file size: 500KB (matching client-side validation)
    const MAX_FILE_SIZE = 500 * 1024;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        throw new Error('No file uploaded');
      }

      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      
      // Server-side file size validation to prevent resource exhaustion
      if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
        console.warn(`File size ${arrayBuffer.byteLength} bytes exceeds limit of ${MAX_FILE_SIZE} bytes`);
        return new Response(
          JSON.stringify({ error: 'File size exceeds 500KB limit. Please upload a smaller file.' }),
          { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
      
      // Validate content length for JSON requests as well
      if (fileContent && fileContent.length > MAX_FILE_SIZE) {
        console.warn(`Content length ${fileContent.length} exceeds limit of ${MAX_FILE_SIZE}`);
        return new Response(
          JSON.stringify({ error: 'File content exceeds 500KB limit. Please upload a smaller file.' }),
          { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }


    // Fast-path: for CSV files, parse directly to avoid AI JSON truncation issues
    if (fileType === 'csv' && fileContent?.trim()) {
      try {
        const directProducts = tryExtractProductsFromCsv(fileContent);
        if (directProducts.length > 0) {
          console.log(`Extracted ${directProducts.length} products via direct CSV parsing`);
          return new Response(
            JSON.stringify({ products: directProducts }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.warn('Direct CSV parsing failed, falling back to AI:', e);
      }
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
    let rawProducts = [];
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
        rawProducts = JSON.parse(jsonMatch[0]);
      } else {
        rawProducts = JSON.parse(cleanedResponse);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to extract product data. Please ensure the file contains product information.');
    }

    // Validate and sanitize AI-parsed products with Zod schema
    if (!Array.isArray(rawProducts)) {
      console.error('AI response is not an array');
      throw new Error('Invalid AI response format. Expected an array of products.');
    }

    const products = validateAndSanitizeProducts(rawProducts);
    console.log(`Validated ${products.length} products out of ${rawProducts.length} raw products`);

    if (products.length === 0 && rawProducts.length > 0) {
      console.warn('All products failed validation');
      throw new Error('Failed to validate product data. Please check the file format.');
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
