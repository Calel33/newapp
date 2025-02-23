# Markdown Formatting Guidelines

## Basic Syntax

```typescript
// headings.ts
const title = "# Main Title";
const section = "## Section";
const subsection = "### Subsection";

// lists.ts
const unorderedList = [
  "- First item",
  "- Second item",
  "  - Nested item"
].join("\n");

const orderedList = [
  "1. First step",
  "2. Second step",
  "   1. Sub-step"
].join("\n");

// emphasis.ts
const formatting = {
  bold: "**bold text**",
  italic: "*italic text*",
  code: "`inline code`"
};

// links.ts
const link = "[Link text](URL)";
const image = "![Alt text](image.png)";

// tables.ts
const table = [
  "| Header 1 | Header 2 |",
  "|----------|----------|",
  "| Cell 1   | Cell 2   |"
].join("\n");

// quotes.ts
const quote = [
  "> This is a blockquote",
  "> Multiple lines"
].join("\n");
```

## Code Blocks

```typescript
// code-examples.ts
const codeBlock = {
  js: `\`\`\`javascript
const greeting = "Hello";
console.log(greeting);
\`\`\``,

  ts: `\`\`\`typescript
interface User {
  name: string;
  age: number;
}
\`\`\``,

  py: `\`\`\`python
def greet(name):
    print(f"Hello {name}")
\`\`\``
};
```

## SQL Examples

Alternatively, you can run the following snippet in your project's [SQL Editor](https://supabase.com/dashboard/project/_/sql/new). This will create an `instruments` table with sample data.

```sql
-- Create the table
create table instruments (
    id bigint primary key generated always as identity,
    name text not null
);

-- Insert sample data
insert into instruments (name)
values 
    ('violin'),
    ('viola'),
    ('cello');

alter table instruments enable row level security;
```

Make the data in your table publicly readable by adding an RLS policy:

```sql
create policy "public can read instruments"
    on public.instruments
    for select to anon
    using (true);
```

## TypeScript Examples

```typescript
// User interface
interface User {
  id: number;
  name: string;
  email: string;
}

// API response type
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

// Example function
async function fetchUser(id: number): Promise<ApiResponse<User>> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  
  return {
    data,
    status: response.status,
    message: 'Success'
  };
}
```

## React Component Example

```tsx
import { useState, useEffect } from 'react';
import { User } from './types';

interface UserCardProps {
  userId: number;
  onUpdate: (user: User) => void;
}

export function UserCard({ userId, onUpdate }: UserCardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetchUser(userId);
        setUser(response.data);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

## Usage Guidelines

- Use appropriate heading levels for document structure
- Keep code blocks together for better readability
- Use consistent formatting throughout the document
- Include language specifiers for code blocks
- Maintain proper indentation in lists and code

## Document Structure

### Spacing
```markdown
Section 1 text here

Section 2 text here
- List item 1
- List item 2

Section 3 text here
```

## Best Practices

1. Review formatting before committing
2. Use a markdown linter
3. Preview documents before publishing
4. Keep formatting consistent across all docs
