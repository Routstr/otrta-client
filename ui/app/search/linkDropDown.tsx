import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import { SchemaResponseSourceProps } from '@/src/api/web-search';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { SourceSelection } from './sourceSelection';
import { DialogTitle } from '@radix-ui/react-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertDialogTitle } from '@radix-ui/react-alert-dialog';

interface Props {
  sources: SchemaResponseSourceProps[];
  sendMessage: (message: string) => void;
  loading: boolean;
  currentGroup: string;
  deleteQA: () => void;
  retryQA: () => void;
}

export function LinkDropDown(props: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <DotsVerticalIcon className='h-10 h-full w-10 rounded-sm p-2' />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <Dialog>
          <DialogTitle></DialogTitle>
          <DialogContent>
            <SourceSelection {...props} />
          </DialogContent>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <span>Customize</span>
            </DropdownMenuItem>
          </DialogTrigger>
        </Dialog>
        <AlertDialog>
          <AlertDialogTitle></AlertDialogTitle>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this
                response.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.stopPropagation();
                  props.deleteQA();
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <span className='text-red-700'>Delete</span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </AlertDialog>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            props.retryQA();
          }}
        >
          Retry
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
