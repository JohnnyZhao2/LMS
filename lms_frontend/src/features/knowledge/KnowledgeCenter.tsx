/**
 * KnowledgeCenter Page
 * Main page for student knowledge center combining list and detail views
 * Requirements: 5.1 - Knowledge center with list and detail views
 */

import { BookOpen } from 'lucide-react';
import { KnowledgeList } from './components/KnowledgeList';

export function KnowledgeCenter() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
                    <BookOpen className="text-primary" /> 知识中心
                </h1>
                <p className="text-text-muted mt-1">
                    浏览和学习运维知识文档，掌握操作规范和应急预案。
                </p>
            </div>

            {/* Knowledge List with filters and pagination */}
            <KnowledgeList />
        </div>
    );
}
