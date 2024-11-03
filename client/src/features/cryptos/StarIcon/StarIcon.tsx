import useUser from '../../../hooks/authentication/useUser';
import { FC } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa';

import './StarIcon.scss';

type StarIconProps = {
  starVisible: boolean;
  onToggle: () => void;
};

const StarIcon: FC<StarIconProps> = ({ starVisible, onToggle }) => {
  const { isAuthenticated } = useUser();

  return (
    <div
      className={`star-icon ${isAuthenticated ? '' : 'icon-disabled'}`}
      onClick={onToggle}
    >
      {starVisible ? <FaRegStar /> : <FaStar className='filled-star' />}
    </div>
  );
};

export default StarIcon;
