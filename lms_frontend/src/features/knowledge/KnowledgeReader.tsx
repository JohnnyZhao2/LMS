/**
 * KnowledgeReader Page
 * Page for viewing knowledge document details
 * Requirements: 5.5, 5.6, 5.7, 5.8 - Knowledge detail view with type-specific rendering
 */

import { useParams, useNavigate } from 'react-router-dom';
import { KnowledgeDetail } from './components/KnowledgeDetail';

export function KnowledgeReader() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    if (!id) {
        return (
            <div className="text-center py-20 text-text-muted">
                未找到知识文档
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <KnowledgeDetail
                knowledgeId={id}
                onBack={() => navigate('/knowledge')}
            />
        </div>
    );
}
