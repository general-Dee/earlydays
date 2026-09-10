"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { BlogPost } from "@/lib/firebase/types";
import { useListFilter } from "@/lib/useListFilter";
import { downloadCsv, toCsv } from "@/lib/csv";

type LoadState = "loading" | "forbidden" | "error" | "ready";

type EditForm = { slug: string; category: string; title: string; excerpt: string; body: string; order: string };

function blankEditForm(post: BlogPost): EditForm {
  return {
    slug: post.slug,
    category: post.category,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body.join("\n\n"),
    order: String(post.order),
  };
}

function getSearchText(post: BlogPost): string {
  return [post.title, post.excerpt, post.category, post.slug].filter(Boolean).join(" ");
}

function postsToCsv(posts: BlogPost[]): string {
  return toCsv(
    ["Title", "Slug", "Category", "Excerpt", "Order"],
    posts.map((p) => [p.title, p.slug, p.category, p.excerpt, String(p.order)])
  );
}

export default function AdminBlogList({ user }: { user: User }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [order, setOrder] = useState("0");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailsSent, setEmailsSent] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { query, setQuery, page, setPage, filtered, paged, totalPages } = useListFilter(posts, getSearchText);

  function exportCsv() {
    downloadCsv("blog-posts", postsToCsv(filtered));
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/blog", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (cancelled) return;

        if (res.status === 403) {
          setState("forbidden");
          return;
        }
        if (!res.ok) {
          setState("error");
          return;
        }

        const data = (await res.json()) as { posts: BlogPost[] };
        setPosts(data.posts);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setEmailsSent(null);

    try {
      const idToken = await user.getIdToken();
      const form = new FormData();
      form.set("slug", slug);
      form.set("category", category);
      form.set("title", title);
      form.set("excerpt", excerpt);
      form.set("body", body);
      form.set("order", order);
      const photo = photoInputRef.current?.files?.[0];
      if (photo) form.set("photo", photo);

      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(data.error ?? "Couldn't save this post. Please try again.");
        return;
      }

      const created = (await res.json()) as BlogPost & { emailsSent: number };
      setPosts((current) => [...current, created].sort((a, b) => a.order - b.order));
      setEmailsSent(created.emailsSent);
      setSlug("");
      setCategory("");
      setTitle("");
      setExcerpt("");
      setBody("");
      setOrder("0");
      if (photoInputRef.current) photoInputRef.current.value = "";
    } catch {
      setSubmitError("Couldn't save this post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(post: BlogPost) {
    setEditingId(post.id);
    setEditForm(blankEditForm(post));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  }

  async function saveEdit(id: string, removePhoto: boolean) {
    if (!editForm) return;
    setEditSubmitting(true);
    setEditError(null);

    try {
      const idToken = await user.getIdToken();
      const form = new FormData();
      form.set("slug", editForm.slug);
      form.set("category", editForm.category);
      form.set("title", editForm.title);
      form.set("excerpt", editForm.excerpt);
      form.set("body", editForm.body);
      form.set("order", editForm.order);
      const photo = editPhotoInputRef.current?.files?.[0];
      if (photo) form.set("photo", photo);
      if (removePhoto) form.set("removePhoto", "true");

      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}` },
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setEditError(data.error ?? "Couldn't save these changes. Please try again.");
        return;
      }

      const updated = (await res.json()) as BlogPost;
      setPosts((current) => current.map((p) => (p.id === id ? updated : p)).sort((a, b) => a.order - b.order));
      setEditingId(null);
      setEditForm(null);
    } catch {
      setEditError("Couldn't save these changes. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function deletePost(id: string) {
    const previous = posts;
    setDeletingId(id);
    setPosts((current) => current.filter((p) => p.id !== id));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        setPosts(previous);
      }
    } catch {
      setPosts(previous);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display text-xl mb-0.5">Blog Posts</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {state === "ready" && filtered.length > 0 && (
            <button onClick={exportCsv} className="btn btn-ghost btn-sm">
              Export CSV
            </button>
          )}
          <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
            Log Out
          </button>
        </div>
      </div>

      <form onSubmit={createPost} className="mt-5 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Slug (e.g. helping-a-shy-child)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="text"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <textarea
          placeholder="Excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          required
          rows={2}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <textarea
          placeholder={"Body — separate paragraphs with a blank line"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={6}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
        <input
          type="number"
          placeholder="Display order"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          required
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2 w-40"
        />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={photoInputRef}
          className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />

        {submitError && <p className="text-[0.8rem] text-clay mb-0">{submitError}</p>}
        <button type="submit" disabled={submitting} className="btn btn-primary btn-sm self-start">
          {submitting ? "Saving…" : "Add Post"}
        </button>
      </form>

      {emailsSent !== null && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-leaf-soft text-leaf text-[0.85rem] font-semibold">
          Post published — emailed {emailsSent} subscriber{emailsSent === 1 ? "" : "s"}.
        </div>
      )}

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading posts…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to manage blog posts.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load posts. Please try again.
        </div>
      )}

      {state === "ready" && posts.length === 0 && (
        <p className="text-sm text-slate mt-5">No blog posts yet.</p>
      )}

      {state === "ready" && posts.length > 0 && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search blog posts…"
          aria-label="Search blog posts"
          className="w-full mt-5 text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
        />
      )}

      {state === "ready" && posts.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate mt-4">No matching blog posts.</p>
      )}

      {state === "ready" && paged.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-4">
          {paged.map((post) => {
            const isEditing = editingId === post.id;

            return (
              <li key={post.id} className="px-3.5 py-3 rounded-lg bg-chalk">
                {isEditing && editForm ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Slug"
                      value={editForm.slug}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, slug: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Category"
                      value={editForm.category}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, category: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Title"
                      value={editForm.title}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, title: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <textarea
                      placeholder="Excerpt"
                      value={editForm.excerpt}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, excerpt: e.target.value } : form))}
                      required
                      rows={2}
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <textarea
                      placeholder="Body"
                      value={editForm.body}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, body: e.target.value } : form))}
                      required
                      rows={6}
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    <input
                      type="number"
                      placeholder="Display order"
                      value={editForm.order}
                      onChange={(e) => setEditForm((form) => (form ? { ...form, order: e.target.value } : form))}
                      required
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2 w-40"
                    />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      ref={editPhotoInputRef}
                      className="text-sm rounded-md border border-slate/20 bg-chalk text-ink px-3 py-2"
                    />
                    {editError && <p className="text-[0.8rem] text-clay mb-0">{editError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(post.id, false)}
                        disabled={editSubmitting}
                        className="btn btn-primary btn-sm"
                      >
                        {editSubmitting ? "Saving…" : "Save"}
                      </button>
                      {post.coverPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => saveEdit(post.id, true)}
                          disabled={editSubmitting}
                          className="btn btn-ghost btn-sm"
                        >
                          Remove Photo
                        </button>
                      )}
                      <button type="button" onClick={cancelEdit} className="btn btn-ghost btn-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">
                        {post.title} · {post.category}
                      </span>
                      <span className="text-xs text-slate">Order {post.order}</span>
                    </div>
                    <p className="text-sm mt-1 mb-0 text-slate">{post.excerpt}</p>
                    {post.coverPhotoUrl && (
                      <p className="text-xs mt-1.5 mb-0 text-slate">Cover photo uploaded</p>
                    )}
                    <div className="flex items-center gap-2 mt-2.5">
                      <button type="button" onClick={() => startEdit(post)} className="btn btn-ghost btn-sm">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePost(post.id)}
                        disabled={deletingId === post.id}
                        className="btn btn-ghost btn-sm"
                      >
                        {deletingId === post.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {state === "ready" && totalPages > 1 && (
        <div className="flex items-center gap-2.5 mt-4">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="btn btn-ghost btn-sm disabled:opacity-40"
          >
            ‹ Prev
          </button>
          <span className="text-xs text-slate">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="btn btn-ghost btn-sm disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
