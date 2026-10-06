import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import './Loader.scss';

interface LoaderProps {
    className?: string;
}

const Loader = ({ className }: LoaderProps) => {
    return (
        <div className={classNames('loader', {}, [className])}>
            <div className="lds-ellipsis">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
        </div>
    );
};

export default memo(Loader);
