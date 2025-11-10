#include "stdafx.h"
#include "Demo_Client.h"
#include "afxsock.h"
#include <iostream>
#include <string>
#include <vector>

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

CWinApp theApp;

using namespace std;

int _tmain(int argc, TCHAR* argv[], TCHAR* envp[])
{
	int nRetCode = 0;

	HMODULE hModule = ::GetModuleHandle(NULL);

	if (hModule != NULL)
	{
		// initialize MFC and print and error on failure
		if (!AfxWinInit(hModule, NULL, ::GetCommandLine(), 0))
		{
			_tprintf(_T("Fatal Error: MFC initialization failed\n"));
			nRetCode = 1;
		}
		else
		{
			// TODO: code your application's behavior here.
			AfxSocketInit(NULL);
			CSocket client;
			
			client.Create();
			client.Connect(_T("127.0.0.1"), 4567);
			
			string username = "Tuan Khang";
			string message, reply;
			int length;

			while (true) {
				
				// gửi
				cout << username << ": ";
				getline(cin, message, '\n');

				if (message == "exit")
					break;

				length = message.size();
				client.Send(&length, sizeof(length), 0);

				client.Send(message.c_str(), length, 0);

				// nhận
				int bytesReceived = client.Receive(&length, sizeof(length), 0);
				if (bytesReceived <= 0) {
					std::cout << "Server disconnected.\n";
					break;
				}

				vector<char> buffer(length + 1);
				int totalReceived = 0;
				while (totalReceived < length) {
					int chunk = client.Receive(buffer.data() + totalReceived, length - totalReceived, 0);
					if (chunk <= 0) {
						cout << "Connection lost.\n";
						break;
					}
					totalReceived += chunk;
				}
				buffer[length] = '\0';

				reply = buffer.data();
				cout << "Server: " << reply << "\n";
			}
		}
	}
	else
	{
		_tprintf(_T("Fatal Error: GetModuleHandle failed\n"));
		nRetCode = 1;
	}

	return nRetCode;
}
