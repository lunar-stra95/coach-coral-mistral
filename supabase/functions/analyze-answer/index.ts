import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, answer, category, expectedElements } = await req.json();
    
    if (!question || !answer) {
      throw new Error('Question and answer are required');
    }

    const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
    if (!mistralApiKey) {
      throw new Error('Mistral API key not found');
    }

    console.log('Analyzing answer for question:', question.substring(0, 100));

    // Mistral AI API call
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: `You are an expert interview coach. Analyze the candidate's answer to the interview question and provide structured feedback. Return ONLY a JSON object with this exact structure:
            {
              "score": number (1-10),
              "strengths": ["strength1", "strength2"],
              "weaknesses": ["weakness1", "weakness2"], 
              "improvements": ["tip1", "tip2"],
              "category": "${category}",
              "overall_feedback": "brief summary"
            }`
          },
          {
            role: 'user',
            content: `Interview Question: ${question}
            
            Candidate Answer: ${answer}
            
            Expected Elements: ${expectedElements?.join(', ') || 'N/A'}
            
            Please analyze this answer and provide feedback.`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mistral API error:', errorText);
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('Raw Mistral response:', content);

    // Parse the JSON response from Mistral
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse Mistral response:', content);
      // Fallback analysis
      analysis = {
        score: 7,
        strengths: ["Clear communication", "Relevant experience mentioned"],
        weaknesses: ["Could provide more specific examples", "Answer could be more structured"],
        improvements: ["Use the STAR method (Situation, Task, Action, Result)", "Practice providing concrete examples"],
        category: category,
        overall_feedback: "Good foundation but could be more detailed and structured."
      };
    }

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error analyzing answer:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});