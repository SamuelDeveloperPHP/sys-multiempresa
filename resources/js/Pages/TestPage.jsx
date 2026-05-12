export default function TestPage({ message }) {
    return (
        <div className="p-8 bg-white rounded-lg shadow-sm m-8">
            <h1 className="text-3xl font-bold text-blue-600">Inertia + React!</h1>
            <p className="mt-4 text-gray-600">{message}</p>
        </div>
    );
}
