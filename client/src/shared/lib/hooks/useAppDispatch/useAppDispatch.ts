import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/shared/lib/store/StateSchema';

export const useAppDispatch = () => useDispatch<AppDispatch>();