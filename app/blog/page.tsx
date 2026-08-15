import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import BlogList from "@/components/BlogList";

export const metadata: Metadata = {
  title: "Notes for Parents — Earlydays Blog",
  description: "Short, practical reads for parents from the Earlydays team.",
};

export default function BlogPage() {
  return (
    <main className="py-20">
      <div className="wrap">
        <SectionHeader
          eyebrow="From Earlydays"
          title="Straight answers for Kaduna parents, no fluff"
          desc="Real questions from real parents — settling in, school readiness, and everything between naptime and Primary 6."
        />
        <BlogList />
      </div>
    </main>
  );
}
