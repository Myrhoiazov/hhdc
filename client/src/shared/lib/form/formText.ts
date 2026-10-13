// The text of a form field without the spaces around it; a field the form does not have is empty.
export const formText = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
