import { ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { Button, Caption1, makeStyles, tokens } from '@fluentui/react-components';

interface TaskPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM
  },
  actions: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  page: { minWidth: '90px', textAlign: 'center' }
});

export function TaskPagination({ page, totalPages, total, onPageChange }: TaskPaginationProps) {
  const styles = useStyles();
  const hasPages = totalPages > 0;
  const currentPage = hasPages ? page : 0;

  return (
    <div className={styles.root}>
      <Caption1>{total} task{total === 1 ? '' : 's'}</Caption1>
      <div className={styles.actions}>
        <Button
          icon={<ChevronLeftRegular />}
          aria-label="Previous page"
          appearance="subtle"
          disabled={!hasPages || page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <Caption1 className={styles.page}>Page {currentPage} of {totalPages}</Caption1>
        <Button
          icon={<ChevronRightRegular />}
          aria-label="Next page"
          appearance="subtle"
          disabled={!hasPages || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </div>
  );
}
