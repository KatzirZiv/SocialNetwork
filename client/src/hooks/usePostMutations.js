import { useMutation } from "@tanstack/react-query";
import { posts } from "../services/api";

export default function usePostMutations({
  queryClient,
  user,
  postsQueryKey = ["posts"],
  invalidateOnSuccess = true,
}) {
  // Create Post
  const createPost = useMutation({
    mutationFn: (formData) => posts.create(formData),
    onSuccess: () => {
      if (invalidateOnSuccess) queryClient.invalidateQueries(postsQueryKey);
    },
  });

  // Update Post
  const updatePost = useMutation({
    mutationFn: ({ postId, content }) => posts.update(postId, { content }),
    onSuccess: () => {
      if (invalidateOnSuccess) queryClient.invalidateQueries(postsQueryKey);
    },
  });

  // Delete Post
  const deletePost = useMutation({
    mutationFn: (postId) => posts.delete(postId),
    onSuccess: () => {
      if (invalidateOnSuccess) queryClient.invalidateQueries(postsQueryKey);
    },
  });

  // Like/Unlike Post
  const likePost = useMutation({
    mutationFn: ({ postId, isLiked }) =>
      isLiked ? posts.unlike(postId) : posts.like(postId),
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: postsQueryKey });
      const previousPosts = queryClient.getQueryData(postsQueryKey);
      queryClient.setQueryData(postsQueryKey, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            data: oldData.data.data.map((p) => {
              if (p._id === postId) {
                const newLikes = isLiked
                  ? p.likes.filter((id) => id !== user?._id)
                  : [...p.likes, user?._id];
                return { ...p, likes: newLikes };
              }
              return p;
            }),
          },
        };
      });
      return { previousPosts };
    },
    onError: (err, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(postsQueryKey, context.previousPosts);
      }
    },
    onSettled: () => {
      if (invalidateOnSuccess) queryClient.invalidateQueries({ queryKey: postsQueryKey });
    },
  });

  // Add Comment
  const addComment = useMutation({
    mutationFn: ({ postId, content }) => posts.addComment(postId, content),
    onSuccess: () => {
      if (invalidateOnSuccess) queryClient.invalidateQueries(postsQueryKey);
    },
  });

  // Update Comment
  const updateComment = useMutation({
    mutationFn: ({ postId, commentId, content }) => posts.updateComment(postId, commentId, content),
    onSuccess: () => {
      if (invalidateOnSuccess) queryClient.invalidateQueries(postsQueryKey);
    },
  });

  // Delete Comment
  const deleteComment = useMutation({
    mutationFn: ({ postId, commentId }) => posts.deleteComment(postId, commentId),
    onSuccess: () => {
      if (invalidateOnSuccess) queryClient.invalidateQueries(postsQueryKey);
    },
  });

  return {
    createPost,
    updatePost,
    deletePost,
    likePost,
    addComment,
    updateComment,
    deleteComment,
  };
} 