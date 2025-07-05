
"use client";

import { useState, useTransition, useCallback, DragEvent, ChangeEvent, useEffect } from 'react';
import { FileUp, Download, Rocket, CheckCircle2, XCircle, RotateCw, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { convertPdfToMarkdown } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { MarkdownPreview } from '@/components/markdown-preview';

type Status = 'idle' | 'converting' | 'success' | 'error';
const conversionSteps = [
    { text: "Uploading file...", duration: 500, progress: 10 },
    { text: "Initializing conversion...", duration: 1000, progress: 20 },
    { text: "Extracting text & images...", duration: 3000, progress: 50 },
    { text: "Analyzing document structure...", duration: 2500, progress: 70 },
    { text: "Generating Markdown...", duration: 3000, progress: 90 },
    { text: "Finalizing package...", duration: 1000, progress: 100 },
];

type ImageAsset = {
    filename: string;
    data: string;
    mimeType: string;
};

export function ConversionFlow() {
    const [status, setStatus] = useState<Status>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [resultMarkdown, setResultMarkdown] = useState('');
    const [resultImages, setResultImages] = useState<ImageAsset[]>([]);
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
        setResultImages([]);
        setErrorMessage('');
        setProgress(0);
        setProgressText('');
    }, []);


    
    useEffect(() => {
        let timeouts: NodeJS.Timeout[] = [];
        if (status === 'converting') {
            setProgress(0);
            setProgressText("Starting...");
            let cumulativeDuration = 0;

            conversionSteps.forEach((step) => {
                const timeoutId = setTimeout(() => {
                    setProgressText(step.text);
                    setProgress(step.progress);
                }, cumulativeDuration);
                timeouts.push(timeoutId);
                cumulativeDuration += step.duration;
            });
        }
        return () => {
            timeouts.forEach(timeout => clearTimeout(timeout));
        };
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
                    setResultImages(result.images || []);
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
    
    const downloadResult = async () => {
        try {
            console.log('Starting download process...');
            console.log('File:', file);
            console.log('Result markdown length:', resultMarkdown?.length);
            console.log('Result images count:', resultImages?.length);

            if (!resultMarkdown) {
                throw new Error('No markdown content available for download');
            }

            const zip = new JSZip();
            const originalFilename = file?.name.replace(/\.pdf$/i, '') || 'document';
            console.log('Original filename:', originalFilename);

            // Add the markdown file
            console.log('Adding markdown file to ZIP...');
            zip.file(`${originalFilename}.md`, resultMarkdown);

            // Add images
            if (resultImages && resultImages.length > 0) {
                console.log('Adding images to ZIP...');
                resultImages.forEach((image, index) => {
                    try {
                        console.log(`Processing image ${index + 1}:`, image.filename, 'data length:', image.data?.length);

                        // Validate and clean base64 data
                        let base64Data = image.data;
                        if (base64Data.startsWith('data:')) {
                            base64Data = base64Data.replace(/^data:[^;]+;base64,/, '');
                        }

                        // Validate base64 format and length
                        if (base64Data && base64Data.length > 0) {
                            // More lenient minimum length check (some small icons might be valid)
                            if (base64Data.length < 20) {
                                console.warn(`Image data too short for: ${image.filename}, length: ${base64Data.length}`);
                                return;
                            }

                            // Ensure base64 string has proper padding
                            const padding = base64Data.length % 4;
                            if (padding > 0) {
                                base64Data += '='.repeat(4 - padding);
                            }

                            // Validate base64 characters (more permissive regex)
                            const base64Regex = /^[A-Za-z0-9+/=]*$/;
                            if (base64Regex.test(base64Data)) {
                                try {
                                    // Additional validation: try to decode to check if it's valid base64
                                    const decoded = atob(base64Data);
                                    if (decoded.length > 0) {
                                        zip.file(image.filename, base64Data, { base64: true });
                                        console.log(`Successfully added image: ${image.filename}, decoded size: ${decoded.length} bytes`);
                                    } else {
                                        console.warn(`Decoded image is empty for: ${image.filename}`);
                                    }
                                } catch (decodeError) {
                                    console.warn(`Failed to decode base64 for: ${image.filename}`, decodeError);
                                    // Try to add it anyway, sometimes the validation is too strict
                                    try {
                                        zip.file(image.filename, base64Data, { base64: true });
                                        console.log(`Added image despite decode error: ${image.filename}`);
                                    } catch (zipError) {
                                        console.error(`Failed to add image to ZIP: ${image.filename}`, zipError);
                                    }
                                }
                            } else {
                                console.warn(`Invalid base64 characters for: ${image.filename}`);
                            }
                        } else {
                            console.warn(`Empty image data for: ${image.filename}`);
                        }
                    } catch (error) {
                        console.error(`Failed to add image ${image.filename}:`, error);
                    }
                });
            } else {
                console.log('No images to add to ZIP');
            }

            // Generate and download the ZIP file
            console.log('Generating ZIP file...');
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 6
                }
            });
            console.log('ZIP blob generated, size:', zipBlob.size);

            if (zipBlob.size === 0) {
                throw new Error('Generated ZIP file is empty');
            }

            console.log('Creating download link...');
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${originalFilename}.zip`;
            link.style.display = 'none';

            document.body.appendChild(link);
            console.log('Triggering download...');
            link.click();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                console.log('Download cleanup completed');
            }, 100);

            toast({
                title: "Download Complete!",
                description: `ZIP file with ${1 + (resultImages?.length || 0)} files downloaded successfully.`,
            });
        } catch (error) {
            console.error('Download failed with error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
            console.error('Error stack:', errorStack);
            toast({
                variant: "destructive",
                title: "Download Failed",
                description: `Failed to create ZIP file: ${errorMessage}. Check console for details.`,
            });
        }
    };

    const onDragEnter = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const onDragLeave = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
    };

    const onDragOver = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault(); // This is necessary to allow dropping
    };

    const onDrop = (e: DragEvent<HTMLLabelElement>) => {
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
                            <CardDescription>
                                Your Markdown is ready with {resultImages.length} image{resultImages.length !== 1 ? 's' : ''} extracted. Tables are embedded directly in the markdown.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MarkdownPreview
                                content={resultMarkdown}
                                className="h-64"
                            />
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="outline" onClick={resetState}>
                                <RotateCw className="mr-2 h-4 w-4" />
                                Convert Another
                            </Button>
                            <div className="flex gap-2">
                                <Button onClick={downloadResult} className="bg-accent text-accent-foreground hover:bg-accent/90">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download ZIP
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        // ZIP with markdown only (no images) for debugging
                                        try {
                                            console.log('Creating ZIP with markdown only...');
                                            const zip = new JSZip();
                                            const originalFilename = file?.name.replace(/\.pdf$/i, '') || 'document';

                                            zip.file(`${originalFilename}.md`, resultMarkdown);

                                            const zipBlob = await zip.generateAsync({
                                                type: 'blob',
                                                compression: 'DEFLATE',
                                                compressionOptions: { level: 6 }
                                            });

                                            const url = URL.createObjectURL(zipBlob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `${originalFilename}-md-only.zip`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(url);

                                            toast({
                                                title: "ZIP Downloaded!",
                                                description: "ZIP with markdown only downloaded successfully.",
                                            });
                                        } catch (error) {
                                            console.error('ZIP markdown download failed:', error);
                                            toast({
                                                variant: "destructive",
                                                title: "Download Failed",
                                                description: "Failed to download ZIP file.",
                                            });
                                        }
                                    }}
                                    title="Download ZIP with only Markdown (no images)"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    ZIP (MD Only)
                                </Button>
                            </div>
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
