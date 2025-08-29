"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFlarebaseClient } from "@/lib/flarebase";
import { format } from "date-fns";
import RecordFormModal from "./record-form";

interface RecordsTableProps {
  collectionName: string;
}

export default function RecordsTable({ collectionName }: RecordsTableProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [schema, setSchema] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("-");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const flarebase = getFlarebaseClient();

      // Get collection schema first
      try {
        const collections = await flarebase.collections.list();
        const collection = collections.items?.find(
          (c: any) => c.name === collectionName
        );
        if (collection) {
          setSchema(JSON.parse(collection.schema));
        }
      } catch (error) {
        console.error("Error fetching schema:", error);
      }

      // Fetch records with pagination
      const response = await flarebase.collection(collectionName).getList({
        page: currentPage,
        perPage: pageSize,
        sort: `${sortDirection}${sortField}`,
        filter: searchQuery,
      });

      setRecords(response.items);
      setTotalRecords(response.total);
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("Không thể tải dữ liệu records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [
    collectionName,
    currentPage,
    pageSize,
    sortField,
    sortDirection,
    searchQuery,
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const query = new FormData(form).get("query") as string;
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSortChange = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "" ? "-" : "");
    } else {
      setSortField(field);
      setSortDirection("-");
    }
  };

  const handleCreateClick = () => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (record: any) => {
    setSelectedRecord(record);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa record này?")) {
      try {
        const flarebase = getFlarebaseClient();
        await flarebase.collection(collectionName).delete(id);
        toast.success("Xóa record thành công");
        fetchRecords();
      } catch (error) {
        console.error("Error deleting record:", error);
        toast.error("Không thể xóa record");
      }
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      const flarebase = getFlarebaseClient();

      if (selectedRecord) {
        // Update record
        await flarebase
          .collection(collectionName)
          .update(selectedRecord.id, data);
        toast.success("Cập nhật record thành công");
      } else {
        // Create record
        await flarebase.collection(collectionName).create(data);
        toast.success("Tạo record thành công");
      }

      setIsFormOpen(false);
      fetchRecords();
    } catch (error) {
      console.error("Error saving record:", error);
      toast.error("Không thể lưu record");
    }
  };

  // Get fields from schema for display
  const fields = Object.keys(schema).filter(
    (key) => key !== "id" && key !== "created_at" && key !== "updated_at"
  );

  // Always show these fields
  const baseFields = ["id", ...fields.slice(0, 3), "created_at"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Records</h2>
        <Button onClick={handleCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Add Record
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <form
          onSubmit={handleSearch}
          className="flex w-full max-w-md space-x-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              name="query"
              placeholder="Search records..."
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex items-center space-x-2">
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(parseInt(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500">per page</span>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {baseFields.map((field) => (
                <TableHead
                  key={field}
                  onClick={() => handleSortChange(field)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  {field}
                  {sortField === field && (
                    <span className="ml-1">
                      {sortDirection === "-" ? "▼" : "▲"}
                    </span>
                  )}
                </TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={baseFields.length + 1}
                  className="text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={baseFields.length + 1}
                  className="text-center"
                >
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  {baseFields.map((field) => (
                    <TableCell key={field}>
                      {formatCellValue(record[field])}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(record)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteClick(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-4 py-2 border-t">
          <div className="text-sm text-gray-500">
            Showing {records.length} of {totalRecords} records
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {Math.ceil(totalRecords / pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(
                  Math.min(Math.ceil(totalRecords / pageSize), currentPage + 1)
                )
              }
              disabled={currentPage === Math.ceil(totalRecords / pageSize)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <RecordFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        record={selectedRecord}
        schema={schema}
      />
    </div>
  );
}

// Helper function to format cell values for display
function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  if (
    typeof value === "string" &&
    (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) ||
      value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/))
  ) {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  }

  return String(value);
}
