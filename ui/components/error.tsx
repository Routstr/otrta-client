export function Error() {
  return (
    <div className='flex items-center justify-center p-4'>
      <div className='text-center'>
        <div className='mb-2 text-red-500'>⚠️</div>
        <p className='text-muted-foreground text-sm'>
          Something went wrong. Please try again.
        </p>
      </div>
    </div>
  );
}
