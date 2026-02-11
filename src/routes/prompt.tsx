import { createFileRoute } from '@tanstack/react-router';
import { PromptForm } from '../presentation/components/PromptForm';

export const Route = createFileRoute('/prompt')({
  component: PromptPage
});

function PromptPage() {
  return <PromptForm />;
}
