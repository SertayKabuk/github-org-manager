'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUserEmailMappings } from "@/lib/hooks";
import { Loading } from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";

export function UserEmailMappingList() {
  const { data: mappings, isLoading, error } = useUserEmailMappings();

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!mappings || mappings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No email mappings found for your account.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Mapped On</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.map((mapping) => (
            <TableRow key={mapping.id}>
              <TableCell className="font-medium">{mapping.email}</TableCell>
              <TableCell>
                {mapping.is_primary ? (
                  <Badge variant="default">Primary</Badge>
                ) : (
                  <Badge variant="secondary">Verified</Badge>
                )}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {new Date(mapping.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
