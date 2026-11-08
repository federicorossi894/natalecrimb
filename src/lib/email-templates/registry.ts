import type { ComponentType } from 'react';
export type TemplateEntry<P extends object = Record<string, unknown>> = { component: ComponentType<P>; subject: string; displayName?: string; previewData?: P };
// Disabled preparation only. The managed scaffold replaces the sender/helper after domain setup.