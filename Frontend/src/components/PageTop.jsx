const PageTop = ({ title }) => {
    return (
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
                <h2 className="text-lg font-medium">{title}</h2>
                <p className="text-sm text-base-text">Manage your {title.toLowerCase()}.</p>
            </div>
            <button className="px-4 py-2 text-white bg-primary rounded-md">Add {title}</button>
        </div>
    )
}

export default PageTop