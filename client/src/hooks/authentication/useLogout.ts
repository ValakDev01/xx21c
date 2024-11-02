import { logout } from '../../services/apiAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

type UserData = {
  status: string;
  message: string;
};

const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate, isLoading } = useMutation<UserData, Error>({
    mutationFn: () => logout(),

    onSuccess: user => {
      queryClient.setQueryData(['currentUser'], null);

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
        toast.success(user.message);
      }, 1500);
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  return { mutate, isLoading };
};

export default useLogout;
