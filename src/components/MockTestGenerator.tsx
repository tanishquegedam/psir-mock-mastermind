import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, FileText, Copy, Download, BookOpen, PenTool, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GeneratedTest {
  questions: string[];
  paper: string;
  timestamp: string;
}

const PAPERS = [
  { value: '1A', label: 'Paper 1A (Western Political Thought, Political Theory)' },
  { value: '1B', label: 'Paper 1B (Indian Political Thought, Indian Government & Politics)' },
  { value: '2A', label: 'Paper 2A (Comparative Politics, Theories of IR)' },
  { value: '2B', label: 'Paper 2B (India & World, Global Issues)' },
];

const PREVIOUS_YEAR_QUESTIONS = [
  { id: 'pyq1', text: '"Human rights debate is caught between the limitations of universalism and cultural relativism." Elaborate.' },
  { id: 'pyq2', text: '"Does the actual working of Indian federalism conform to the centralising tendencies in Indian polity?" Discuss.' },
  { id: 'pyq3', text: 'Identify the major differences between the classical realism of Hans J. Morgenthau and the neorealism of Kenneth Waltz. Which approach is best suited for analyzing international relations after the Cold War?' },
  { id: 'pyq4', text: '"The Panchayats with Gram Sabhas should be so organised as to identify the resources locally available for the development in agricultural and industrial sectors." Examine the statement in the context of Gram Swaraj.' },
  { id: 'pyq5', text: 'Discuss the main limitations of the comparative method to the study of Political Science.' },
];

export function MockTestGenerator() {
  const [selectedPaper, setSelectedPaper] = useState('');
  const [customQuestions, setCustomQuestions] = useState('');
  const [articleLinks, setArticleLinks] = useState('');
  const [specificTopics, setSpecificTopics] = useState('');
  const [selectedPYQs, setSelectedPYQs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<GeneratedTest | null>(null);
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

  const generateMockTest = async () => {
    if (!selectedPaper) {
      toast({
        title: "Paper Selection Required",
        description: "Please select a paper to generate the mock test.",
        variant: "destructive",
      });
      return;
    }

    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to generate the test.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Count custom questions and adjust accordingly
      const customQuestionsArray = customQuestions
        .split('\n')
        .filter(q => q.trim())
        .map(q => q.trim());
      
      const articleLinksArray = articleLinks
        .split('\n')
        .filter(link => link.trim())
        .map(link => link.trim());
      
      const topicsArray = specificTopics
        .split(',')
        .filter(topic => topic.trim())
        .map(topic => topic.trim());

      // Get selected PYQ texts
      const selectedPYQTexts = selectedPYQs.map(id => 
        PREVIOUS_YEAR_QUESTIONS.find(pyq => pyq.id === id)?.text || ''
      ).filter(text => text);

      const customCount = customQuestionsArray.length;
      const articleCount = articleLinksArray.length;
      const topicCount = topicsArray.length;
      const pyqCount = selectedPYQTexts.length;
      const remainingQuestions = Math.max(0, 20 - customCount - articleCount - topicCount - pyqCount);

      const selectedPaperInfo = PAPERS.find(p => p.value === selectedPaper);

      const prompt = `You are an expert UPSC PSIR paper-setter. Create a ${remainingQuestions > 0 ? remainingQuestions : 20}-question UPSC-style mock test for PSIR ${selectedPaperInfo?.label}. Follow these rules:

${customCount > 0 ? `- Include these ${customCount} custom questions exactly as provided: ${customQuestionsArray.join(' | ')}` : ''}
${articleCount > 0 ? `- For these article URLs: ${articleLinksArray.join(', ')} - FIRST use web search to read and understand the complete content of each article. Then generate 1 high-quality UPSC question per article based on the core themes, arguments, and insights from the article content. IMPORTANT: Do NOT mention the article, its title, author, or source in the question. Frame it as a general UPSC question that tests understanding of the concepts discussed in the article.` : ''}
${topicCount > 0 ? `- Ensure 1 question per topic is included for: ${topicsArray.join(', ')}` : ''}
${pyqCount > 0 ? `- Include these ${pyqCount} previous year questions exactly as provided: ${selectedPYQTexts.join(' | ')}` : ''}

${remainingQuestions > 0 ? `Generate ${remainingQuestions} additional questions from across the syllabus of the selected paper, with weightage based on past UPSC trends:
- Common themes like justice, equality, realism, globalisation, Indian secularism, federalism, IR theories should appear more.
- Less frequent themes should appear only occasionally unless explicitly requested.` : ''}

Requirements:
- All questions must be in UPSC CSE mains format (analytical, thematic, clear, concise)
- Avoid duplication and ensure all questions are unique
- Balance difficulty levels and test conceptual understanding
- Return exactly 20 questions total

Format: Return as a numbered list (1. Question text)`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert UPSC PSIR mock test generator. Create high-quality, exam-style questions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate test');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse the questions from the response
      const questions = content
        .split('\n')
        .filter((line: string) => line.match(/^\d+\./))
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim());

      // Combine all questions: custom, PYQs, and generated
      const allQuestions = [...customQuestionsArray, ...selectedPYQTexts, ...questions];

      setGeneratedTest({
        questions: allQuestions.slice(0, 20), // Ensure exactly 20 questions
        paper: selectedPaperInfo?.label || selectedPaper,
        timestamp: new Date().toLocaleString(),
      });

      toast({
        title: "Mock Test Generated!",
        description: `Successfully generated ${allQuestions.slice(0, 20).length} questions for ${selectedPaperInfo?.label}`,
      });

    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate mock test. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedTest) return;
    
    const text = `PSIR Mains Mock Test - ${generatedTest.paper}\nGenerated on: ${generatedTest.timestamp}\n\n${generatedTest.questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}`;
    
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Mock test copied to clipboard",
    });
  };

  const downloadPDF = () => {
    if (!generatedTest) return;
    
    const text = `PSIR Mains Mock Test - ${generatedTest.paper}\nGenerated on: ${generatedTest.timestamp}\n\n${generatedTest.questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PSIR_Mock_Test_${selectedPaper}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Mock test downloaded successfully",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Brand Logo */}
          <div className="mb-6">
            <img 
              src="/lovable-uploads/b0b1863b-835c-4fd2-88f3-fa90e09eee41.png" 
              alt="Shubhra Ranjan - Always Ahead" 
              className="h-16 mx-auto object-contain"
            />
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-academic bg-clip-text text-transparent">
              PSIR Mains Mock Test Generator
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Generate high-quality, UPSC-style Political Science & International Relations mock tests 
            with intelligent question balancing and customization options.
          </p>
        </div>

        {!generatedTest ? (
          /* Input Form */
          <Card className="max-w-4xl mx-auto shadow-[var(--shadow-elegant)]">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-academic/5 border-b">
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Test Configuration
              </CardTitle>
              <CardDescription>
                Configure your mock test parameters below. All fields except paper selection are optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* API Key Input */}
              <div className="space-y-2">
                <Label htmlFor="apiKey">OpenAI API Key *</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="transition-all duration-300 focus:shadow-[var(--shadow-card)]"
                />
                <p className="text-sm text-muted-foreground">
                  Your API key is used securely and not stored. Get one from{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    OpenAI Platform
                  </a>
                </p>
              </div>

              {/* Paper Selection */}
              <div className="space-y-2">
                <Label htmlFor="paper">Select Paper *</Label>
                <Select value={selectedPaper} onValueChange={setSelectedPaper}>
                  <SelectTrigger className="transition-all duration-300 focus:shadow-[var(--shadow-card)]">
                    <SelectValue placeholder="Choose a PSIR paper" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPERS.map((paper) => (
                      <SelectItem key={paper.value} value={paper.value}>
                        {paper.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Questions */}
              <div className="space-y-2">
                <Label htmlFor="customQuestions">Custom Questions (Optional)</Label>
                <Textarea
                  id="customQuestions"
                  placeholder="Enter custom questions you want to include (one per line)..."
                  value={customQuestions}
                  onChange={(e) => setCustomQuestions(e.target.value)}
                  rows={4}
                  className="transition-all duration-300 focus:shadow-[var(--shadow-card)]"
                />
                <p className="text-sm text-muted-foreground">
                  These questions will be included exactly as written
                </p>
              </div>

              {/* Article Links */}
              <div className="space-y-2">
                <Label htmlFor="articleLinks">Article Links (Optional)</Label>
                <Textarea
                  id="articleLinks"
                  placeholder="Paste article URLs (one per line) to generate questions from..."
                  value={articleLinks}
                  onChange={(e) => setArticleLinks(e.target.value)}
                  rows={3}
                  className="transition-all duration-300 focus:shadow-[var(--shadow-card)]"
                />
                <p className="text-sm text-muted-foreground">
                  One question will be generated per article based on its content
                </p>
              </div>

              {/* Specific Topics */}
              <div className="space-y-2">
                <Label htmlFor="specificTopics">Specific Topics (Optional)</Label>
                <Input
                  id="specificTopics"
                  placeholder="e.g., Machiavelli, Parliament, India-China border"
                  value={specificTopics}
                  onChange={(e) => setSpecificTopics(e.target.value)}
                  className="transition-all duration-300 focus:shadow-[var(--shadow-card)]"
                />
                <p className="text-sm text-muted-foreground">
                  Comma-separated topics. One question will be generated per topic.
                </p>
              </div>

              {/* Previous Year Questions */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Include Previous Year Question(s) (Optional)
                </Label>
                <div className="border rounded-md p-3 bg-background space-y-3 max-h-64 overflow-y-auto">
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose 1 or more to insert into your mock test
                  </p>
                  {PREVIOUS_YEAR_QUESTIONS.map((pyq) => (
                    <div key={pyq.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={pyq.id}
                        checked={selectedPYQs.includes(pyq.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPYQs([...selectedPYQs, pyq.id]);
                          } else {
                            setSelectedPYQs(selectedPYQs.filter(id => id !== pyq.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={pyq.id}
                        className="text-sm leading-relaxed cursor-pointer flex-1"
                      >
                        {pyq.text}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedPYQs.length > 0 && (
                  <p className="text-sm text-primary">
                    Selected: {selectedPYQs.length} question{selectedPYQs.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateMockTest}
                disabled={isGenerating || !selectedPaper || !apiKey}
                className="w-full bg-gradient-to-r from-primary to-academic hover:opacity-90 text-lg py-6 transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elegant)]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Your Mock Test...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-5 w-5" />
                    Generate Mock Test
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Generated Test Display */
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Test Header */}
            <Card className="shadow-[var(--shadow-elegant)]">
              <CardHeader className="bg-gradient-to-r from-accent/10 to-accent/5 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-primary">Mock Test Generated Successfully</CardTitle>
                    <CardDescription className="text-lg">
                      {generatedTest.paper} • {generatedTest.timestamp}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={copyToClipboard} variant="outline">
                      <Copy className="mr-2 h-4 w-4" />
                      Copy All
                    </Button>
                    <Button onClick={downloadPDF} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button onClick={() => setGeneratedTest(null)} variant="outline">
                      New Test
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Questions */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="p-6">
                <div className="space-y-6">
                  {generatedTest.questions.map((question, index) => (
                    <div key={index} className="border-b border-border last:border-b-0 pb-4 last:pb-0">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <p className="text-foreground leading-relaxed flex-1">{question}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}