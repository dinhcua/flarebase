'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs,
  TabList,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Card,
  Title,
  Text,
  Button,
} from '@tremor/react';
import { PencilIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { getflarebaseClient } from '@/lib/flarebase';
import { Collection } from '@/types';
import { format } from 'date-fns';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-github';
import RecordsTable from '@/components/collections/records-table';
import CollectionFormModal from '@/components/collections/collection-form';

export default function CollectionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  const fetchCollection = async () => {
    try {
      const flarebase = getflarebaseClient();
      const data = await flarebase.collections.getOne(params.id);
      setCollection(data);
    } catch (error) {
      console.error('Error fetching collection:', error);
      toast.error('Không thể tải thông tin collection');
      router.push('/collections');
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
      const flarebase = getflarebaseClient();
      await flarebase.collections.update(params.id, data);
      toast.success('Cập nhật collection thành công');
      setIsFormOpen(false);
      fetchCollection();
    } catch (error) {
      console.error('Error updating collection:', error);
      toast.error('Không thể cập nhật collection');
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
        <Text>Collection không tồn tại hoặc đã bị xóa.</Text>
        <Button
          className="mt-4"
          onClick={() => router.push('/collections')}
        >
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
    console.error('Error parsing schema:', e);
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{collection.name}</h1>
          <p className="text-gray-500">
            Created on {format(new Date(collection.created_at), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
        <Button 
          icon={PencilIcon} 
          color="blue" 
          onClick={handleEditClick}
        >
          Edit Collection
        </Button>
      </div>
      
      <TabGroup index={activeTab} onIndexChange={setActiveTab}>
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Schema</Tab>
          <Tab>Records</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="mt-4 space-y-6">
              <Card>
                <Title>Collection Details</Title>
                <div className="mt-4 space-y-4">
                  <div>
                    <Text className="font-semibold">ID</Text>
                    <Text>{collection.id}</Text>
                  </div>
                  <div>
                    <Text className="font-semibold">Name</Text>
                    <Text>{collection.name}</Text>
                  </div>
                  <div>
                    <Text className="font-semibold">Created</Text>
                    <Text>{format(new Date(collection.created_at), 'dd/MM/yyyy HH:mm:ss')}</Text>
                  </div>
                  <div>
                    <Text className="font-semibold">Last Updated</Text>
                    <Text>{format(new Date(collection.updated_at), 'dd/MM/yyyy HH:mm:ss')}</Text>
                  </div>
                </div>
              </Card>
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-4">
              <Card>
                <Title>Collection Schema</Title>
                <div className="mt-4">
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
                </div>
              </Card>
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-4">
              <RecordsTable collectionName={collection.name} />
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
      
      <CollectionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        collection={collection}
      />
    </div>
  );
}