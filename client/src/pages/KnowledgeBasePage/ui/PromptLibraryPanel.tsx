import { useTranslation } from 'react-i18next';
import { AiPrompt, AiPromptSlot, PROMPT_SLOT_LABELS, PromptForm } from '../promptLibraryTypes';
import s from './KnowledgeBasePage.module.scss';

const SLOTS: AiPromptSlot[] = ['DRAFT_BODY', 'CLASSIFICATION'];

const PromptForm_ = ({ form, setForm, editingId, saving, save, resetForm }: {
    form: PromptForm;
    setForm: (form: PromptForm) => void;
    editingId: number | null;
    saving: boolean;
    save: () => void;
    resetForm: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <div className={s.simulationBlock}>
            <h3>{editingId ? t('Редактировать промпт') : t('Новый промпт')}</h3>
            <div className={s.grid}>
                <label>{t('Слот')}
                    <select disabled={!!editingId} value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value as AiPromptSlot })}>
                        {SLOTS.map((slot) => <option key={slot} value={slot}>{PROMPT_SLOT_LABELS[slot]}</option>)}
                    </select>
                </label>
                <label>{t('Название')}
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="v2 — короче" />
                </label>
                <label>{t('Теги (через запятую)')}
                    <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="эксперимент, короткий" />
                </label>
            </div>
            <label className={s.textareaLabel}>{t('Текст промпта')}
                <textarea className={s.textarea} rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </label>
            {form.slot === 'DRAFT_BODY' && (
                <p className={s.simulationHint}>{t('Можно использовать {{replyLanguage}} — подставится язык ответа.')}</p>
            )}
            <div className={s.actions}>
                <button className={s.primary} disabled={saving} onClick={save}>{editingId ? t('Сохранить') : t('Создать')}</button>
                {editingId && <button onClick={resetForm}>{t('Отмена')}</button>}
            </div>
        </div>
    );
};

const PromptRow = ({ prompt, onEdit, onActivate, onRemove }: {
    prompt: AiPrompt;
    onEdit: (prompt: AiPrompt) => void;
    onActivate: (id: number) => void;
    onRemove: (id: number) => void;
}) => {
    const { t } = useTranslation();
    return (
        <tr>
            <td className={s.title}>{prompt.name}</td>
            <td>{prompt.tags.join(', ')}</td>
            <td>{prompt.isActive
                ? <span className={`${s.badge} ${s.status_ACTIVE}`}>{t('Активен')}</span>
                : <span className={`${s.badge} ${s.status_INACTIVE}`}>{t('Неактивен')}</span>}
            </td>
            <td className={s.actions}>
                {!prompt.isActive && <button onClick={() => onActivate(prompt.id)}>{t('Активировать')}</button>}
                <button onClick={() => onEdit(prompt)}>{t('Редактировать')}</button>
                <button className={s.danger} onClick={() => onRemove(prompt.id)}>{t('Удалить')}</button>
            </td>
        </tr>
    );
};

export const PromptLibraryPanel = ({ prompts, form, setForm, editingId, saving, startEdit, resetForm, save, activate, remove }: {
    prompts: AiPrompt[];
    form: PromptForm;
    setForm: (form: PromptForm) => void;
    editingId: number | null;
    saving: boolean;
    startEdit: (prompt: AiPrompt) => void;
    resetForm: () => void;
    save: () => void;
    activate: (id: number) => void;
    remove: (id: number) => void;
}) => {
    const { t } = useTranslation();
    return (
        <section className={s.card}>
            <h2>{t('Промпты (системные инструкции для модели)')}</h2>
            <p className={s.simulationHint}>
                {t('Активный промпт каждого слота используется и в симуляции, и в реальной автогенерации писем клиентам.')}
            </p>
            {SLOTS.map((slot) => (
                <div key={slot} className={`${s.tableWrap} ${s.promptSlotGroup}`}>
                    <h3>{PROMPT_SLOT_LABELS[slot]}</h3>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>{t('Название')}</th>
                                <th>{t('Теги')}</th>
                                <th>{t('Статус')}</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {prompts.filter((prompt) => prompt.slot === slot).map((prompt) => (
                                <PromptRow key={prompt.id} prompt={prompt} onEdit={startEdit} onActivate={activate} onRemove={remove} />
                            ))}
                            {!prompts.some((prompt) => prompt.slot === slot) && (
                                <tr><td colSpan={4} className={s.empty}>{t('Нет сохранённых промптов — используется встроенный по умолчанию')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ))}
            <PromptForm_ form={form} setForm={setForm} editingId={editingId} saving={saving} save={save} resetForm={resetForm} />
        </section>
    );
};
