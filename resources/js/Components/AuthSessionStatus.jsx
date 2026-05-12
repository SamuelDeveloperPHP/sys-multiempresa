export default function AuthSessionStatus({ status, className = '', ...props }) {
    return (
        <>
            {status && (
                <div {...props} className={'font-medium text-sm text-green-600 ' + className}>
                    {status}
                </div>
            )}
        </>
    );
}
