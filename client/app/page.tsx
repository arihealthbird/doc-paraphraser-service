'use client';

import { DottedSurface } from '@/components/ui/dotted-surface';
import { cn } from '@/lib/utils';
import { Upload, Settings2, Download, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

type Config = {
	tone: 'neutral' | 'formal' | 'casual';
	formality: 'high' | 'medium' | 'low';
	creativity: 'conservative' | 'moderate' | 'creative';
	model: string;
	preserveFormatting: boolean;
};

type JobStatus = {
	progress: number;
	status: 'pending' | 'processing' | 'completed' | 'failed';
	error?: string;
};

export default function Home() {
	const [file, setFile] = useState<File | null>(null);
	const [documentData, setDocumentData] = useState<any>(null);
	const [config, setConfig] = useState<Config>({
		tone: 'neutral',
		formality: 'medium',
		creativity: 'moderate',
		model: 'anthropic/claude-3.5-sonnet',
		preserveFormatting: true,
	});
	const [models, setModels] = useState<any[]>([]);
	const [jobId, setJobId] = useState<string | null>(null);
	const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
	const [error, setError] = useState<string>('');
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// Load models on mount
	useEffect(() => {
		fetch('http://localhost:3000/api/models')
			.then((res) => res.json())
			.then((data) => setModels(data.models || []))
			.catch((err) => console.error('Failed to load models:', err));
	}, []);

	// Poll job status
	useEffect(() => {
		if (jobId && jobStatus?.status !== 'completed' && jobStatus?.status !== 'failed') {
			pollIntervalRef.current = setInterval(async () => {
				try {
					const res = await fetch(`http://localhost:3000/api/job/${jobId}`);
					const status = await res.json();
					setJobStatus(status);

					if (status.status === 'completed' || status.status === 'failed') {
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current);
							pollIntervalRef.current = null;
						}
					}
				} catch (err) {
					console.error('Failed to poll job status:', err);
				}
			}, 2000);

			return () => {
				if (pollIntervalRef.current) {
					clearInterval(pollIntervalRef.current);
					pollIntervalRef.current = null;
				}
			};
		}
	}, [jobId, jobStatus?.status]);

	const handleFileSelect = useCallback(async (selectedFile: File) => {
		setFile(selectedFile);
		setError('');
		setIsUploading(true);
		setJobStatus(null);
		setJobId(null);

		const formData = new FormData();
		formData.append('document', selectedFile);

		try {
			const res = await fetch('http://localhost:3000/api/upload', {
				method: 'POST',
				body: formData,
			});

			if (!res.ok) throw new Error('Upload failed');

			const data = await res.json();
			setDocumentData(data);
		} catch (err) {
			setError('Failed to upload file: ' + (err as Error).message);
			setFile(null);
		} finally {
			setIsUploading(false);
		}
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);

			if (e.dataTransfer.files.length > 0) {
				handleFileSelect(e.dataTransfer.files[0]);
			}
		},
		[handleFileSelect]
	);

	const handleParaphrase = async () => {
		if (!documentData) return;

		setError('');
		setJobStatus({ progress: 0, status: 'pending' });

		try {
			const res = await fetch('http://localhost:3000/api/paraphrase', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					documentId: documentData.documentId,
					filePath: documentData.filePath,
					fileType: documentData.fileType,
					config,
				}),
			});

			if (!res.ok) throw new Error('Failed to start paraphrasing');

			const result = await res.json();
			setJobId(result.jobId);
			setJobStatus({ progress: 0, status: 'processing' });
		} catch (err) {
			setError('Failed to start paraphrasing: ' + (err as Error).message);
			setJobStatus(null);
		}
	};

	const handleDownload = () => {
		if (!documentData) return;
		window.location.href = `http://localhost:3000/api/download/${documentData.documentId}?fileType=${documentData.fileType}`;
	};

	return (
		<div className="relative min-h-screen bg-background text-foreground overflow-hidden">
			<DottedSurface />

			{/* Gradient overlay */}
			<div
				aria-hidden="true"
				className={cn(
					'pointer-events-none absolute -top-10 left-1/2 size-full -translate-x-1/2 rounded-full',
					'bg-[radial-gradient(ellipse_at_center,var(--foreground)/.05,transparent_50%)]',
					'blur-[100px]'
				)}
			/>

			<div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
				<div className="w-full max-w-4xl space-y-8">
					{/* Header */}
					<div className="text-center space-y-4">
						<div className="inline-flex items-center gap-3 mb-2">
							<Sparkles className="h-10 w-10 text-foreground/80" />
							<h1 className="font-mono text-5xl font-bold tracking-tight">
								Document Paraphraser
							</h1>
						</div>
						<p className="text-xl text-muted-foreground">
							AI-powered text transformation for documents up to 700+ pages
						</p>
					</div>

					{/* Upload Area */}
					<div
						className={cn(
							'relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer',
							isDragging
								? 'border-foreground/50 bg-foreground/5'
								: 'border-foreground/20 bg-background/50 backdrop-blur-sm',
							file ? 'border-solid border-green-500/50 bg-green-500/5' : ''
						)}
						onDrop={handleDrop}
						onDragOver={(e) => {
							e.preventDefault();
							setIsDragging(true);
						}}
						onDragLeave={() => setIsDragging(false)}
						onClick={() => !file && fileInputRef.current?.click()}
					>
						<input
							ref={fileInputRef}
							type="file"
							className="hidden"
							accept=".pdf,.docx,.txt"
							onChange={(e) => {
								if (e.target.files?.length) {
									handleFileSelect(e.target.files[0]);
								}
							}}
						/>

						<div className="p-12 text-center">
							{isUploading ? (
								<div className="flex flex-col items-center gap-4">
									<Loader2 className="h-12 w-12 animate-spin text-foreground/60" />
									<p className="text-lg text-muted-foreground">Uploading...</p>
								</div>
							) : file ? (
								<div className="flex flex-col items-center gap-4">
									<CheckCircle2 className="h-12 w-12 text-green-500" />
									<div>
										<p className="text-lg font-medium">{file.name}</p>
										<p className="text-sm text-muted-foreground">
											{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to paraphrase
										</p>
									</div>
									<button
										onClick={(e) => {
											e.stopPropagation();
											setFile(null);
											setDocumentData(null);
											setJobStatus(null);
											setJobId(null);
										}}
										className="text-sm text-muted-foreground hover:text-foreground underline"
									>
										Remove file
									</button>
								</div>
							) : (
								<div className="flex flex-col items-center gap-4">
									<Upload className="h-12 w-12 text-foreground/40" />
									<div>
										<p className="text-lg font-medium">Drop your document here or click to browse</p>
										<p className="text-sm text-muted-foreground mt-2">
											Supports PDF, DOCX, TXT • Max 100MB
										</p>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Configuration */}
					{file && (
						<div className="rounded-2xl border border-foreground/10 bg-background/50 backdrop-blur-sm p-8 space-y-6">
							<div className="flex items-center gap-3 text-lg font-semibold">
								<Settings2 className="h-5 w-5" />
								<span>Configuration</span>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="text-sm font-medium text-muted-foreground mb-2 block">
										Tone
									</label>
									<select
										value={config.tone}
										onChange={(e) => setConfig({ ...config, tone: e.target.value as any })}
										className="w-full rounded-lg border border-foreground/20 bg-background/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
									>
										<option value="neutral">Neutral</option>
										<option value="formal">Formal</option>
										<option value="casual">Casual</option>
									</select>
								</div>

								<div>
									<label className="text-sm font-medium text-muted-foreground mb-2 block">
										Formality Level
									</label>
									<select
										value={config.formality}
										onChange={(e) => setConfig({ ...config, formality: e.target.value as any })}
										className="w-full rounded-lg border border-foreground/20 bg-background/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
									>
										<option value="high">High</option>
										<option value="medium">Medium</option>
										<option value="low">Low</option>
									</select>
								</div>

								<div>
									<label className="text-sm font-medium text-muted-foreground mb-2 block">
										Creativity
									</label>
									<select
										value={config.creativity}
										onChange={(e) => setConfig({ ...config, creativity: e.target.value as any })}
										className="w-full rounded-lg border border-foreground/20 bg-background/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
									>
										<option value="conservative">Conservative</option>
										<option value="moderate">Moderate</option>
										<option value="creative">Creative</option>
									</select>
								</div>
							</div>

							<div>
								<label className="text-sm font-medium text-muted-foreground mb-2 block">
									AI Model
								</label>
								<select
									value={config.model}
									onChange={(e) => setConfig({ ...config, model: e.target.value })}
									className="w-full rounded-lg border border-foreground/20 bg-background/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
								>
									<option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Default)</option>
									{models.map((model) => (
										<option key={model.id} value={model.id}>
											{model.name}
										</option>
									))}
								</select>
							</div>

							<div className="flex items-center justify-between p-4 rounded-lg border border-foreground/20 bg-background/80">
								<div>
									<label className="text-sm font-medium block mb-1">
										Preserve Formatting
									</label>
									<p className="text-xs text-muted-foreground">
										Maintain document structure and layout
									</p>
								</div>
								<button
									type="button"
									onClick={() => setConfig({ ...config, preserveFormatting: !config.preserveFormatting })}
									className={cn(
										'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
										config.preserveFormatting ? 'bg-foreground' : 'bg-foreground/20'
									)}
								>
									<span
										className={cn(
											'inline-block h-4 w-4 transform rounded-full bg-background transition-transform',
											config.preserveFormatting ? 'translate-x-6' : 'translate-x-1'
										)}
									/>
								</button>
							</div>

							<button
								onClick={handleParaphrase}
								disabled={!documentData || jobStatus?.status === 'processing'}
								className="w-full rounded-lg bg-foreground text-background px-6 py-4 font-semibold text-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{jobStatus?.status === 'processing' ? (
									<>
										<Loader2 className="h-5 w-5 animate-spin" />
										Processing...
									</>
								) : (
									<>
										<Sparkles className="h-5 w-5" />
										Start Paraphrasing
									</>
								)}
							</button>
						</div>
					)}

					{/* Progress */}
					{jobStatus && jobStatus.status !== 'completed' && (
						<div className="rounded-2xl border border-foreground/10 bg-background/50 backdrop-blur-sm p-8 space-y-4">
							<div className="text-center space-y-2">
								<p className="text-5xl font-bold">{jobStatus.progress}%</p>
								<p className="text-sm text-muted-foreground">
									{jobStatus.status === 'processing' ? 'Processing your document...' : 'Starting...'}
								</p>
							</div>

							<div className="relative h-3 w-full overflow-hidden rounded-full bg-foreground/10">
								<div
									className="h-full bg-foreground transition-all duration-500 ease-out"
									style={{ width: `${jobStatus.progress}%` }}
								/>
							</div>
						</div>
					)}

					{/* Success / Download */}
					{jobStatus?.status === 'completed' && (
						<div className="rounded-2xl border border-green-500/30 bg-green-500/5 backdrop-blur-sm p-8 text-center space-y-6">
							<div className="flex flex-col items-center gap-4">
								<CheckCircle2 className="h-16 w-16 text-green-500" />
								<div>
									<h3 className="text-2xl font-bold mb-2">Paraphrasing Complete!</h3>
									<p className="text-muted-foreground">Your document is ready to download</p>
								</div>
							</div>

							<button
								onClick={handleDownload}
								className="w-full rounded-lg bg-green-500 text-white px-6 py-4 font-semibold text-lg transition-all hover:bg-green-600 flex items-center justify-center gap-2"
							>
								<Download className="h-5 w-5" />
								Download Paraphrased Document
							</button>
						</div>
					)}

					{/* Error */}
					{error && (
						<div className="rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-sm p-6">
							<p className="text-red-500 text-center">{error}</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
