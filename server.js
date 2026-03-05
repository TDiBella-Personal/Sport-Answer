import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const client = new Anthropic();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/analyze', async (req, res) => {
  const { activity } = req.body;

  if (!activity || typeof activity !== 'string' || activity.trim().length === 0) {
    return res.status(400).json({ error: 'Activity name is required.' });
  }

  const name = activity.trim();

  const prompt = `You are a sports classification expert with deep knowledge of athletics, games, and physical activities worldwide. Carefully and accurately analyze the activity "${name}" and answer each of the 10 yes/no questions below.

For each question answer:
- true (yes) or false (no) based on the factual, real-world characteristics of "${name}"
- A single concise reasoning sentence (10–18 words max) explaining your answer

Questions:
1. Does it involve a ball, puck, disc, or similar object central to play? (e.g., ball, puck, shuttlecock, disc, javelin, or other manipulated object)
2. Does it require leaving the ground — jumping, leaping, or aerial phases? (any movement not fully supported by the ground)
3. Does it carry inherent danger or risk of harm beyond normal exertion? (real potential for injury from contact, falls, speed, or collisions)
4. Does it demand significant physical exertion or cardiovascular endurance? (sustained effort well beyond a short burst)
5. Does it involve direct competition against opponents? (head-to-head or team vs. team — not just racing a clock or chasing a score)
6. Does it have standardized, objective scoring or win conditions? (measurable outcomes like goals, points, times, or distances)
7. Does it always produce a definitive winner — no ties allowed? (rules prevent or resolve draws via overtime, sudden death, etc.)
8. Does it require strategic decision-making or tactics during play? (positioning, plays, defense/offense choices beyond pure physical reaction)
9. Does it require specialized footwear? (cleats, skates, or anything your mom would yell at you for wearing in the house)
10. Does it have a referee or official who can ruin your day? (a human authority with real power to penalize or eject)

Respond ONLY with valid JSON — no markdown, no code fences, no extra text:
{
  "answers": [true, false, true, false, true, true, false, true, false, true],
  "reasoning": [
    "Reason for Q1 here.",
    "Reason for Q2 here.",
    "Reason for Q3 here.",
    "Reason for Q4 here.",
    "Reason for Q5 here.",
    "Reason for Q6 here.",
    "Reason for Q7 here.",
    "Reason for Q8 here.",
    "Reason for Q9 here.",
    "Reason for Q10 here."
  ]
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim();

    // Extract JSON if Claude wraps it in code fences anyway
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Response did not contain valid JSON');

    const data = JSON.parse(match[0]);

    if (
      !Array.isArray(data.answers) || data.answers.length !== 10 ||
      !Array.isArray(data.reasoning) || data.reasoning.length !== 10
    ) {
      throw new Error('Response structure invalid');
    }

    res.json({ answers: data.answers, reasoning: data.reasoning });
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: 'Claude could not analyze this activity. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🏆 Sport Answer running at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY is not set — AI mode will fail.');
  }
});
