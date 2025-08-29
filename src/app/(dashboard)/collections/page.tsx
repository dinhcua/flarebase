"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getFlarebaseClient } from "@/lib/flarebase";
import { Collection } from "@/types";
import { format } from "date-fns";
import CollectionFormModal from "@/components/collections/collection-form";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCollections = async () => {
    try {
      const flarebase = getFlarebaseClient();
      const data = await flarebase.collections.list();
      setCollections(data);
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast.error("Không thể tải danh sách collections");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleCreateClick = () => {
    setSelectedCollection(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (collection: Collection) => {
    setSelectedCollection(collection);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa collection này?")) {
      setIsDeleting(true);
      try {
        const flarebase = getFlarebaseClient();
        await flarebase.collections.delete(id);
        toast.success("Xóa collection thành công");
        fetchCollections();
      } catch (error) {
        console.error("Error deleting collection:", error);
        toast.error("Không thể xóa collection");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      const flarebase = getFlarebaseClient();

      if (selectedCollection) {
        // Update collection
        await flarebase.collections.update(selectedCollection.id, {
          name: data.name,
          schema: data.schema,
        });
        toast.success("Cập nhật collection thành công");
      } else {
        // Create collection
        await flarebase.collections.create({
          name: data.name,
          schema: data.schema,
        });
        toast.success("Tạo collection thành công");
      }

      setIsFormOpen(false);
      fetchCollections();
    } catch (error) {
      console.error("Error saving collection:", error);
      toast.error("Không thể lưu collection");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-gray-500">
            Quản lý các collection trong cơ sở dữ liệu
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo Collection
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Records</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Cập nhật lần cuối</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  <span>
                    Chưa có collection nào. Hãy tạo collection đầu tiên!
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              collections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell>
                    <Link
                      href={`/collections/${collection.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {collection.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {(collection as any).recordCount || 0} records
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(
                      new Date(collection.created_at),
                      "dd/MM/yyyy HH:mm"
                    )}
                  </TableCell>
                  <TableCell>
                    {format(
                      new Date(collection.updated_at),
                      "dd/MM/yyyy HH:mm"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(collection)}
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteClick(collection.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <CollectionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        collection={selectedCollection}
      />
    </div>
  );
}
