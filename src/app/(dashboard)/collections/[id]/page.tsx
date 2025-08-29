"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit } from "lucide-react";
import { toast } from "sonner";
import { getFlarebaseClient } from "@/lib/flarebase";
import { Collection } from "@/types";
import { format } from "date-fns";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-github";
import RecordsTable from "@/components/collections/records-table";
import CollectionFormModal from "@/components/collections/collection-form";

export default function CollectionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const fetchCollection = async () => {
    try {
      const flarebase = getFlarebaseClient();
      const data = await flarebase.collections.getOne(params.id);
      setCollection(data);
    } catch (error) {
      console.error("Error fetching collection:", error);
      toast.error("Không thể tải thông tin collection");
      router.push("/collections");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection();
  }, [params.id]);

  const handleEditClick = () => {
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      const flarebase = getFlarebaseClient();
      await flarebase.collections.update(params.id, {
        name: data.name,
        schema: data.schema,
      });
      toast.success("Cập nhật collection thành công");
      setIsFormOpen(false);
      fetchCollection();
    } catch (error) {
      console.error("Error updating collection:", error);
      toast.error("Không thể cập nhật collection");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p>Collection không tồn tại hoặc đã bị xóa.</p>
        <Button className="mt-4" onClick={() => router.push("/collections")}>
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  // Format schema for display
  let formattedSchema = collection.schema;
  try {
    const parsed = JSON.parse(collection.schema);
    formattedSchema = JSON.stringify(parsed, null, 2);
  } catch (e) {
    console.error("Error parsing schema:", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{collection.name}</h1>
          <p className="text-gray-500">
            Created on{" "}
            {format(new Date(collection.created_at), "dd/MM/yyyy HH:mm")}
          </p>
        </div>
        <Button onClick={handleEditClick}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Collection
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold">ID</p>
                <p>{collection.id}</p>
              </div>
              <div>
                <p className="font-semibold">Name</p>
                <p>{collection.name}</p>
              </div>
              <div>
                <p className="font-semibold">Created</p>
                <p>
                  {format(
                    new Date(collection.created_at),
                    "dd/MM/yyyy HH:mm:ss"
                  )}
                </p>
              </div>
              <div>
                <p className="font-semibold">Last Updated</p>
                <p>
                  {format(
                    new Date(collection.updated_at),
                    "dd/MM/yyyy HH:mm:ss"
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collection Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <AceEditor
                mode="json"
                theme="github"
                value={formattedSchema}
                readOnly
                name="schema-viewer"
                editorProps={{ $blockScrolling: true }}
                setOptions={{
                  useWorker: false,
                  showLineNumbers: true,
                  tabSize: 2,
                }}
                width="100%"
                height="400px"
                className="rounded border border-gray-300"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="records" className="space-y-4">
          <RecordsTable collectionName={collection.name} />
        </TabsContent>
      </Tabs>

      <CollectionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        collection={collection}
      />
    </div>
  );
}
