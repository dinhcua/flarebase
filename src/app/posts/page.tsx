'use client';

import { useState, useEffect } from 'react';
import flarebaseClient from '@/lib/flarebase';
import { Post } from '@/types/models';

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        // Sử dụng flarebaseClient với generic type Post
        const response = await flarebaseClient.collection<Post>('posts').getList();
        setPosts(response.items);
      } catch (error) {
        console.error('Lỗi khi tải bài viết:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Danh sách bài viết</h1>
      
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map(post => (
            <div key={post.id} className="border p-4 rounded shadow">
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="mt-2">{post.content}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {post.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 text-sm px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Cập nhật: {new Date(post.updated_at).toLocaleDateString('vi-VN')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}