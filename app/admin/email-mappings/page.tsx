'use client';

import { useState } from "react";
import { Search, Mail, Github, Calendar, Download } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useQuery } from "@tanstack/react-query";

interface EmailMapping {
    id: number;
    github_username: string;
    github_user_id: number;
    email: string;
    is_primary: boolean;
    created_at: string;
}

async function fetchEmailMappings(search?: string): Promise<EmailMapping[]> {
    const params = new URLSearchParams();
    if (search) {
        params.set("search", search);
    }
    const response = await fetch(withBasePath(`/api/email-mappings?${params.toString()}`));
    if (!response.ok) {
        throw new Error("Failed to fetch email mappings");
    }
    const data = await response.json();
    return data.data || [];
}

import { withBasePath } from "@/lib/utils";

export default function EmailMappingsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isExporting, setIsExporting] = useState(false);

    // Debounce search
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        // Simple debounce
        setTimeout(() => {
            setDebouncedSearch(value);
        }, 300);
    };

    // Handle CSV export
    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await fetch(withBasePath("/api/email-mappings/export"));
            if (!response.ok) {
                throw new Error("Failed to export email mappings");
            }
            
            // Get the filename from the Content-Disposition header
            const contentDisposition = response.headers.get("Content-Disposition");
            let filename = "email-mappings.csv";
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) {
                    filename = match[1];
                }
            }
            
            // Create a blob from the response and trigger download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error exporting email mappings:", error);
            alert("Failed to export email mappings. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const {
        data: mappings = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ["email-mappings", debouncedSearch],
        queryFn: () => fetchEmailMappings(debouncedSearch),
    });

    if (error) {
        return <ErrorMessage message={error.message} />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Email Mappings</h1>
                <p className="text-muted-foreground">
                    View GitHub username to email mappings collected from user logins.
                </p>
            </div>

            {/* Search */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Search</CardTitle>
                    <CardDescription>Search by email address or GitHub username</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by email or username..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Mappings
                                {!isLoading && (
                                    <Badge variant="secondary" className="ml-2">
                                        {mappings.length} records
                                    </Badge>
                                )}
                            </CardTitle>
                        </div>
                        <Button
                            onClick={handleExport}
                            disabled={isExporting}
                            variant="outline"
                            size="sm"
                        >
                            <Download className="h-4 w-4" />
                            {isExporting ? "Exporting..." : "Export CSV"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : mappings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-sm text-muted-foreground">
                                {debouncedSearch
                                    ? "No mappings found matching your search."
                                    : "No email mappings collected yet. Users need to login to create mappings."}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>GitHub User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Primary</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mappings.map((mapping) => (
                                    <TableRow key={mapping.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Github className="h-4 w-4 text-muted-foreground" />
                                                <a
                                                    href={`https://github.com/${mapping.github_username}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-medium text-primary hover:underline"
                                                >
                                                    @{mapping.github_username}
                                                </a>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                {mapping.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {mapping.is_primary && (
                                                <Badge variant="default" className="text-xs">
                                                    Primary
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                {new Date(mapping.created_at).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
