import { memo, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '@/widgets/Page/Page';
import { BranchCard } from '../BranchCard/BranchCard';
import { BranchModal } from '../BranchModal/BranchModal';
import { useBranches } from './useBranches';
import { BranchesHeader } from './BranchesHeader';
import { BranchesEmptyState } from './BranchesEmptyState';
import s from './BranchesPage.module.scss';

const BranchesPage = memo(() => {
    const [searchParams] = useSearchParams();
    const { branches, loading, modalOpen, editBranch, fetchBranches, onDelete, onEdit, onClose, openCreate } = useBranches();
    const query = (searchParams.get('_q') ?? '').trim().toLowerCase();
    const filteredBranches = useMemo(() => branches.filter((branch) => (
        !query || [branch.name, branch.city, branch.address].filter(Boolean).join(' ').toLowerCase().includes(query)
    )), [branches, query]);

    return (
        <Page>
            <BranchesHeader onCreate={openCreate} />

            {loading ? (
                <div className={s.empty}>Загружаем филиалы...</div>
            ) : filteredBranches.length === 0 ? (
                <BranchesEmptyState onCreate={openCreate} />
            ) : (
                <div className={s.list}>
                    {filteredBranches.map((branch) => (
                        <BranchCard
                            key={branch.id}
                            branch={branch}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}

            <BranchModal
                isOpen={modalOpen}
                onClose={onClose}
                onSaved={fetchBranches}
                editBranch={editBranch}
            />
        </Page>
    );
});

export default BranchesPage;