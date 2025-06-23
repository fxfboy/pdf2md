
"use client";

import { useState, useTransition, useCallback, DragEvent, ChangeEvent, useEffect } from 'react';
import { FileUp, Settings2, Download, Rocket, CheckCircle2, XCircle, RotateCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { convertPdfToMarkdown } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

type Status = 'idle' | 'converting' | 'success' | 'error';
const conversionSteps = [
    { text: "Uploading file...", duration: 500 },
    { text: "Initializing conversion...", duration: 1000 },
    { text: "Extracting text & images...", duration: 3000 },
    { text: "Analyzing document structure...", duration: 2500 },
    { text: "Generating Markdown...", duration: 3000 },
    { text: "Finalizing package...", duration: 1000 },
];

export function ConversionFlow() {
    const [status, setStatus] = useState<Status>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [resultMarkdown, setResultMarkdown] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const resetState = useCallback(() => {
        setStatus('idle');
        setFile(null);
        setResultMarkdown('');
        setErrorMessage('');
        setProgress(0);
        setProgressText('');
    }, []);

    const simulateProgress = useCallback(() => {
        let cumulativeDuration = 0;
        const totalDuration = conversionSteps.reduce((acc, step) => acc + step.duration, 0);

        conversionSteps.forEach(step => {
            setTimeout(() => {
                if(status !== 'converting') return;
                setProgressText(step.text);
                const stepProgress = ((cumulativeDuration + step.duration) / totalDuration) * 100;
                setProgress(stepProgress);
            }, cumulativeDuration);
            cumulativeDuration += step.duration;
        });
    }, [status]);
    
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (status === 'converting') {
            setProgress(0);
            setProgressText("Starting...");
            let cumulativeDuration = 0;
            const totalDuration = conversionSteps.reduce((acc, step) => acc + step.duration, 0);

            conversionSteps.forEach(step => {
                timeoutId = setTimeout(() => {
                    setProgressText(step.text);
                    const stepProgress = ((cumulativeDuration + step.duration) / totalDuration) * 100;
                    setProgress(stepProgress);
                }, cumulativeDuration);
                cumulativeDuration += step.duration;
            });
        }
        return () => clearTimeout(timeoutId);
    }, [status]);


    const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = (selectedFile: File | null) => {
        if (selectedFile) {
            if (selectedFile.type !== 'application/pdf') {
                toast({
                    variant: "destructive",
                    title: "Invalid File Type",
                    description: "Please upload a valid PDF file.",
                });
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleConvert = async () => {
        if (!file) {
            toast({
                variant: "destructive",
                title: "No File Selected",
                description: "Please select a PDF file to convert.",
            });
            return;
        }

        setStatus('converting');
        
        startTransition(async () => {
            try {
                const pdfDataUri = await readFileAsDataURL(file);
                const result = await convertPdfToMarkdown({ pdfDataUri, filename: file.name });
                
                if (result.success && result.markdown) {
                    setResultMarkdown(result.markdown);
                    setStatus('success');
                    setProgress(100);
                    toast({
                        title: "Conversion Successful!",
                        description: "Your Markdown file is ready for download.",
                    });
                } else {
                    setErrorMessage(result.error || 'Conversion failed.');
                    setStatus('error');
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'An unknown error occurred during file processing.';
                setErrorMessage(message);
                setStatus('error');
            }
        });
    };
    
    const downloadResult = () => {
        const blob = new Blob([resultMarkdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const originalFilename = file?.name.replace(/\.pdf$/i, '') || 'document';
        link.download = `${originalFilename}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
    };

    const onDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // This is necessary to allow dropping
    };

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };
    
    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const renderContent = () => {
        switch(status) {
            case 'converting':
                return (
                    <CardContent className="p-8 text-center">
                        <Rocket className="mx-auto h-12 w-12 text-primary animate-pulse" />
                        <h3 className="mt-4 text-xl font-semibold">Conversion in Progress</h3>
                        <p className="mt-2 text-muted-foreground">{progressText}</p>
                        <Progress value={progress} className="mt-4 w-full" />
                    </CardContent>
                );
            case 'success':
                return (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                Conversion Complete!
                            </CardTitle>
                            <CardDescription>Your Markdown is ready. Here's a preview.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                readOnly
                                value={resultMarkdown}
                                className="h-64 font-code text-sm"
                                aria-label="Generated Markdown"
                            />
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="outline" onClick={resetState}>
                                <RotateCw className="mr-2 h-4 w-4" />
                                Convert Another
                            </Button>
                            <Button onClick={downloadResult} className="bg-accent text-accent-foreground hover:bg-accent/90">
                                <Download className="mr-2 h-4 w-4" />
                                Download ZIP
                            </Button>
                        </CardFooter>
                    </>
                );
            case 'error':
                return (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <XCircle className="h-6 w-6" />
                                Conversion Failed
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert variant="destructive">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" onClick={resetState}>
                                <RotateCw className="mr-2 h-4 w-4" />
                                Try Again
                            </Button>
                        </CardFooter>
                    </>
                );
            case 'idle':
            default:
                return (
                    <>
                        <CardContent className="p-6">
                            <label
                                htmlFor="pdf-upload"
                                className={cn(
                                    "relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-12 text-center transition-colors duration-200 hover:border-primary",
                                    isDraggingOver && "border-primary bg-primary/10"
                                )}
                                onDragEnter={onDragEnter}
                                onDragLeave={onDragLeave}
                                onDragOver={onDragOver}
                                onDrop={onDrop}
                            >
                                <FileUp className="h-10 w-10 text-muted-foreground" />
                                <p className="mt-4 font-semibold text-foreground">
                                    {file ? file.name : "Drag & drop a PDF here, or click to select"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Maximum file size: 50MB"}
                                </p>
                                <input id="pdf-upload" type="file" className="sr-only" accept=".pdf" onChange={onFileChange} disabled={isPending} />
                            </label>

                            <div className="mt-6 space-y-4">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="image-quality" className="text-base">Image Quality</Label>
                                        <p className="text-sm text-muted-foreground">Adjust quality for extracted images.</p>
                                    </div>
                                    <Select defaultValue="high" disabled={isPending}>
                                        <SelectTrigger id="image-quality" className="w-[180px]">
                                            <SelectValue placeholder="Select quality" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="complex-layout" className="text-base">Complex Layouts</Label>
                                        <p className="text-sm text-muted-foreground">Enable for better table and column handling.</p>
                                    </div>
                                    <Switch id="complex-layout" defaultChecked disabled={isPending} />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                                size="lg"
                                onClick={handleConvert}
                                disabled={!file || isPending}
                            >
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                                Convert to Markdown
                            </Button>
                        </CardFooter>
                    </>
                );
        }
    };

    return (
        <div className="flex justify-center">
            <Card className="w-full max-w-2xl shadow-xl">
                {renderContent()}
            </Card>
        </div>
    );
}
